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

/** Ventana de captura tal como se guarda en Firestore. */
export interface CaptureWindow {
  /** Instante de inicio en UTC (ISO). Es lo que se compara con el reloj. */
  startAt: string;
  /** Instante de cierre en UTC (ISO). */
  endAt: string;
  /** Inicio tal como lo tecleó el admin, en hora de Texas: "YYYY-MM-DDTHH:MM". */
  startLocal: string;
  /** Cierre tal como lo tecleó el admin, en hora de Texas. */
  endLocal: string;
  /** Uid de quien la configuró. */
  updatedBy: string | null;
}

export type CaptureWindowStatus = 'unset' | 'before' | 'open' | 'closed';

/** Partes de la fecha/hora de un instante, vistas en la zona del app. */
function zonedParts(date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const out: Record<string, number> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
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

/** Estado de la ventana en un instante dado. */
export function windowStatus(window: CaptureWindow | null, nowMs: number): CaptureWindowStatus {
  if (!window) return 'unset';
  const start = new Date(window.startAt).getTime();
  const end = new Date(window.endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 'unset';
  if (nowMs < start) return 'before';
  if (nowMs > end) return 'closed';
  return 'open';
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
      const text = (value: unknown): string => (typeof value === 'string' ? value : '');
      const startAt = text(data.startAt);
      const endAt = text(data.endAt);
      if (startAt === '' || endAt === '') {
        onData(null);
        return;
      }
      onData({
        startAt,
        endAt,
        startLocal: text(data.startLocal) || isoToTexasLocal(startAt),
        endLocal: text(data.endLocal) || isoToTexasLocal(endAt),
        updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
      });
    },
    onError,
  );
}

/** Guarda la ventana a partir de las horas de pared de Texas. */
export async function saveCaptureWindow(
  id: string,
  startLocal: string,
  endLocal: string,
  updatedBy: string | null,
): Promise<void> {
  const startAt = texasLocalToIso(startLocal);
  const endAt = texasLocalToIso(endLocal);
  if (!startAt || !endAt) throw new Error('Both the start and the end date/time are required');
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error('The end must be after the start');
  }
  await setDocument(WINDOWS_COLLECTION, id, {
    startAt,
    endAt,
    startLocal,
    endLocal,
    timeZone: APP_TIME_ZONE,
    updatedBy,
  });
}

/** Quita la ventana: nadie (salvo admin) puede capturar hasta abrir otra. */
export async function clearCaptureWindow(id: string): Promise<void> {
  await deleteDoc(doc(db, WINDOWS_COLLECTION, id));
}
