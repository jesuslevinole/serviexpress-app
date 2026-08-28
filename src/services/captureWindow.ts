import { doc, onSnapshot, deleteDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/config';
import { setDocument } from './firestoreService';

/**
 * Zona horaria oficial del app. Todas las ventanas de captura se definen y
 * se muestran en hora de Texas (Central), sin importar desde dónde entre
 * cada usuario: así el BC de otra zona ve exactamente el mismo reloj que el
 * administrador que abrió la ventana.
 */
export const APP_TIME_ZONE = 'America/Chicago';

/** Colección donde viven las ventanas de captura (un documento por módulo). */
const WINDOWS_COLLECTION = 'settings_windows';

/**
 * Ventana de captura SEMANAL tal como se guarda en Firestore: se elige el
 * día de la semana y la hora (de Texas) en que abre y en que cierra, y se
 * repite cada semana. Ej.: lunes 08:00 -> domingo 23:59.
 */
export interface CaptureWindow {
  /** Día en que abre: 0=domingo … 6=sábado. */
  startDay: number;
  /** Hora de Texas en que abre, "HH:MM". */
  startTime: string;
  /** Día en que cierra. */
  endDay: number;
  /** Hora de Texas en que cierra, "HH:MM". */
  endTime: string;
  /**
   * true = el cierre cae en la SEMANA SIGUIENTE a la apertura (martes ->
   * miércoles de la próxima semana). Con más de 7 días la siguiente ventana
   * abre antes de que cierre la anterior: la captura nunca queda cerrada y
   * cada elemento se puede capturar una vez por ciclo semanal.
   */
  endNextWeek: boolean;
  /** Uid de quien la configuró. */
  updatedBy: string | null;
}

/**
 * Aparición concreta de la ventana semanal: la que está abierta ahora o,
 * si estamos entre semanas, la próxima. En instantes UTC para comparar.
 */
export interface WindowOccurrence {
  startAt: string;
  endAt: string;
}

/** Con ventana semanal no hay "cerrada para siempre": tras cerrar, espera la próxima. */
export type CaptureWindowStatus = 'unset' | 'before' | 'open';

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Partes de la fecha/hora de un instante, vistas en la zona del app. */
function zonedParts(date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const out: Record<string, number> = {};
  parts.forEach((part) => {
    if (part.type === 'weekday') {
      out.weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part.value);
    } else if (part.type !== 'literal') {
      out[part.type] = Number(part.value);
    }
  });
  return out;
}

/** Minutos que la zona del app está adelantada (o atrasada) respecto a UTC en ese instante. */
function zoneOffsetMinutes(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * Convierte una hora "de pared" de Texas ("YYYY-MM-DDTHH:MM", lo que devuelve
 * un input datetime-local) al instante UTC que le corresponde. Se resuelve el
 * cambio de horario de verano volviendo a medir el desfase sobre el resultado.
 */
export function texasLocalToIso(local: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match.map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = zoneOffsetMinutes(new Date(guess));
  let result = guess - first * 60000;
  const second = zoneOffsetMinutes(new Date(result));
  if (second !== first) result = guess - second * 60000;
  return new Date(result).toISOString();
}

/** Instante UTC -> hora de pared de Texas ("YYYY-MM-DDTHH:MM"), para el input. */
export function isoToTexasLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = zonedParts(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Fecha de hoy en Texas ("YYYY-MM-DD"): la que deben tomar los registros. */
export function texasToday(): string {
  return isoToTexasLocal(new Date().toISOString()).slice(0, 10);
}

/** Hora actual en Texas, legible ("Aug 28, 2026, 6:05 AM CT"). */
export function formatTexas(iso: string, withSeconds = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const text = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  }).format(date);
  return `${text} CT`;
}

/** Duración legible: "2d 5h 12m 03s". Nunca negativa. */
export function formatDuration(ms: number, withSeconds = true): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  if (withSeconds) parts.push(`${String(seconds).padStart(2, '0')}s`);
  return parts.join(' ');
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" de un día contado en un calendario "de pared" (sin zona). */
function fakeDateIso(fakeUtcMs: number): string {
  return new Date(fakeUtcMs).toISOString().slice(0, 10);
}

/** ¿"HH:MM" válida? */
function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** "08:00" -> "8:00 AM", para los avisos. */
export function formatClock(time: string): string {
  if (!isTime(time)) return time;
  const [hh, mm] = time.split(':').map(Number);
  const suffix = hh < 12 ? 'AM' : 'PM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

/** Cuántos días separan la apertura del cierre (0 = mismo día). */
export function windowSpanDays(window: CaptureWindow): number {
  let spanDays = (window.endDay - window.startDay + 7) % 7;
  // Mismo día con hora de cierre no posterior: la ventana da la vuelta a la
  // semana completa (lunes 08:00 -> lunes 07:59 de la siguiente).
  if (spanDays === 0 && window.endTime <= window.startTime) spanDays = 7;
  if (window.endNextWeek) spanDays += 7;
  return spanDays;
}

/** ¿El cierre cae en una semana posterior a la de la apertura? */
export function closesInLaterWeek(window: CaptureWindow): boolean {
  return window.endNextWeek || window.endDay < window.startDay ||
    (window.endDay === window.startDay && window.endTime <= window.startTime);
}

/** ¿Las apariciones se traslapan (la siguiente abre antes de cerrar esta)? */
export function windowsOverlap(window: CaptureWindow): boolean {
  return windowSpanDays(window) > 7 ||
    (windowSpanDays(window) === 7 && window.endTime > window.startTime);
}

/** "Every week from Monday 8:00 AM to Sunday 11:59 PM (Texas time)". */
export function describeSchedule(window: CaptureWindow): string {
  const laterWeek = closesInLaterWeek(window) ? ' of the following week' : ' of that same week';
  return `every week from ${DAY_NAMES[window.startDay]} ${formatClock(window.startTime)} to ${
    DAY_NAMES[window.endDay]
  }${laterWeek} at ${formatClock(window.endTime)} (Texas time)`;
}

/**
 * Aparición vigente de la ventana semanal en el instante dado: si estamos
 * dentro de una, esa (estado "open"); si no, la próxima (estado "before").
 * Todo el cálculo se hace sobre el calendario de pared de Texas y solo al
 * final se convierte a UTC, para que el cambio de horario de verano no
 * recorra la hora que el admin eligió.
 */
export function resolveOccurrence(
  window: CaptureWindow | null,
  nowMs: number,
): {
  status: CaptureWindowStatus;
  occurrence: WindowOccurrence | null;
  /** Cierre de la aparición anterior (para "closed since …" entre semanas). */
  previousEnd: string | null;
} {
  if (!window || !isTime(window.startTime) || !isTime(window.endTime)) {
    return { status: 'unset', occurrence: null, previousEnd: null };
  }
  const wall = zonedParts(new Date(nowMs));
  const todayFake = Date.UTC(wall.year, wall.month - 1, wall.day);
  const spanDays = windowSpanDays(window);

  const occurrenceFrom = (startFake: number): WindowOccurrence | null => {
    const startAt = texasLocalToIso(`${fakeDateIso(startFake)}T${window.startTime}`);
    const endAt = texasLocalToIso(`${fakeDateIso(startFake + spanDays * DAY_MS)}T${window.endTime}`);
    return startAt && endAt ? { startAt, endAt } : null;
  };

  // Aparición cuyo inicio es el más reciente que ya pasó.
  let startFake = todayFake - ((((wall.weekday - window.startDay) % 7) + 7) % 7) * DAY_MS;
  let occurrence = occurrenceFrom(startFake);
  if (!occurrence) return { status: 'unset', occurrence: null, previousEnd: null };
  if (new Date(occurrence.startAt).getTime() > nowMs) {
    startFake -= 7 * DAY_MS;
    occurrence = occurrenceFrom(startFake);
    if (!occurrence) return { status: 'unset', occurrence: null, previousEnd: null };
  }

  // ¿Ya cerró? Entonces lo que aplica es la PRÓXIMA aparición, y el cierre
  // de esta queda como referencia ("closed since Wednesday 11:59 PM").
  if (nowMs > new Date(occurrence.endAt).getTime()) {
    const previousEnd = occurrence.endAt;
    occurrence = occurrenceFrom(startFake + 7 * DAY_MS);
    if (!occurrence) return { status: 'unset', occurrence: null, previousEnd: null };
    return { status: 'before', occurrence, previousEnd };
  }
  if (nowMs < new Date(occurrence.startAt).getTime()) {
    return { status: 'before', occurrence, previousEnd: null };
  }
  return { status: 'open', occurrence, previousEnd: null };
}

/** Solo el estado, para quien no necesita las fechas de la aparición. */
export function windowStatus(window: CaptureWindow | null, nowMs: number): CaptureWindowStatus {
  return resolveOccurrence(window, nowMs).status;
}

/** Suscripción en vivo a la ventana de un módulo (null = no configurada). */
export function subscribeToCaptureWindow(
  id: string,
  onData: (window: CaptureWindow | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, WINDOWS_COLLECTION, id),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      const day = (value: unknown): number | null =>
        typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
          ? value
          : null;
      const text = (value: unknown): string => (typeof value === 'string' ? value : '');
      const startDay = day(data.startDay);
      const endDay = day(data.endDay);
      const startTime = text(data.startTime);
      const endTime = text(data.endTime);
      // Documentos de la versión anterior (fechas fijas) o incompletos: se
      // tratan como "sin ventana" para que el admin la vuelva a abrir semanal.
      if (startDay === null || endDay === null || startTime === '' || endTime === '') {
        onData(null);
        return;
      }
      onData({
        startDay,
        startTime,
        endDay,
        endTime,
        endNextWeek: data.endNextWeek === true,
        updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
      });
    },
    onError,
  );
}

/** Guarda la ventana semanal (día de la semana + hora de Texas). */
export async function saveCaptureWindow(
  id: string,
  window: Omit<CaptureWindow, 'updatedBy'>,
  updatedBy: string | null,
): Promise<void> {
  if (!isTime(window.startTime) || !isTime(window.endTime)) {
    throw new Error('Both the opening and the closing time are required');
  }
  await setDocument(WINDOWS_COLLECTION, id, {
    startDay: window.startDay,
    startTime: window.startTime,
    endDay: window.endDay,
    endTime: window.endTime,
    endNextWeek: window.endNextWeek,
    timeZone: APP_TIME_ZONE,
    updatedBy,
  });
}

/** Quita la ventana: nadie (salvo admin) puede capturar hasta abrir otra. */
export async function clearCaptureWindow(id: string): Promise<void> {
  await deleteDoc(doc(db, WINDOWS_COLLECTION, id));
}
