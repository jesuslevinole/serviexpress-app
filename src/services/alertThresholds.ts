import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Umbrales de alerta por campo numérico: un valor MENOR O IGUAL al umbral se
 * pinta en rojo en todas las tablas (Diff mileage en 0 o menos, cauchos
 * gastados, etc.). Los configura el admin desde el botón "Alerts" y aplican
 * para todos.
 */
const DOC_PATH = ['settings_alerts', 'thresholds'] as const;

/** Umbrales de fábrica (aplican mientras el admin no configure otros). */
export const DEFAULT_THRESHOLDS: Record<string, number> = {
  differenceMileage: 0,
  // Difference mileage calculado (Next mant − Actual Mileage): en 0 o menos
  // el camión ya se pasó de su mantenimiento.
  diffMileage: 0,
};

/**
 * Cada campo numérico guarda hasta TRES datos en el mismo mapa:
 *  - `<campo>`        = valor en el que se pone ROJO ("Turns red at").
 *  - `<campo>__dir`   = 1 si el rojo es "ese valor o MÁS" (escala que sube);
 *                       sin él, "ese valor o MENOS" (escala que baja, p. ej. llantas).
 *  - `<campo>__max`   = valor MÁXIMO que acepta el campo: el formulario no deja
 *                       guardar uno mayor (y uno viejo por encima se ve en rojo).
 */
export const MAX_SUFFIX = '__max';
export const DIR_SUFFIX = '__dir';

export interface AlertRule {
  /** Valor en el que se pone rojo. */
  redAt?: number;
  /** true = rojo con ese valor o MÁS; false = con ese valor o MENOS. */
  higher: boolean;
  /** Máximo que acepta el campo. */
  max?: number;
}

export function alertRule(key: string, thresholds: Record<string, number>): AlertRule {
  return {
    redAt: thresholds[key],
    higher: thresholds[key + DIR_SUFFIX] === 1,
    max: thresholds[key + MAX_SUFFIX],
  };
}

const fmtNumber = (n: number) => n.toLocaleString('en-US');

/** La regla en palabras simples ("Accepts up to 6 · Red at 1 or lower"); null si no hay nada. */
export function describeAlertRule(key: string, thresholds: Record<string, number>): string | null {
  const { redAt, higher, max } = alertRule(key, thresholds);
  const parts: string[] = [];
  if (max !== undefined) parts.push(`Accepts up to ${fmtNumber(max)}`);
  if (redAt !== undefined) parts.push(`Red at ${fmtNumber(redAt)} or ${higher ? 'higher' : 'lower'}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export type AlertThresholds = Record<string, number>;

/**
 * Campos numéricos SIN alerta configurable (decisión del cliente): millaje
 * actual, next mant heredado del camión, dolly y baterías no se pintan.
 */
export const ALERT_EXEMPT_KEYS = new Set(['mileage', 'nextMant', 'dolly', 'batteries']);

export function subscribeAlertThresholds(
  onData: (thresholds: AlertThresholds) => void,
): () => void {
  return onSnapshot(
    doc(db, DOC_PATH[0], DOC_PATH[1]),
    (snapshot) => {
      const raw = snapshot.data()?.values;
      const values: AlertThresholds = { ...DEFAULT_THRESHOLDS };
      if (raw && typeof raw === 'object') {
        Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === 'number' && Number.isFinite(value)) values[key] = value;
          // null = el admin quitó la alerta de fábrica de ese campo.
          if (value === null) delete values[key];
        });
      }
      onData(values);
    },
    () => onData({ ...DEFAULT_THRESHOLDS }),
  );
}

export async function saveAlertThresholds(
  values: Record<string, number | null>,
  updatedBy: string | null,
): Promise<void> {
  await setDoc(doc(db, DOC_PATH[0], DOC_PATH[1]), {
    values,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}
