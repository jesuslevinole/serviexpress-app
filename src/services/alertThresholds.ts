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
 * Sufijo del VALOR MÁXIMO de un campo: `frontLDriver__max = 120` pinta en
 * rojo lo que pase de 120. El mínimo sigue en la clave del campo (`<=`).
 */
export const MAX_SUFFIX = '__max';

/** Mínimo (rojo si es <=) y máximo (rojo si es >) configurados para un campo. */
export function alertRule(
  key: string,
  thresholds: Record<string, number>,
): { min?: number; max?: number } {
  return { min: thresholds[key], max: thresholds[key + MAX_SUFFIX] };
}

/** Regla en palabras: "Red when ≤ 30 or > 120"; null si el campo no alerta. */
export function describeAlertRule(key: string, thresholds: Record<string, number>): string | null {
  const { min, max } = alertRule(key, thresholds);
  const fmt = (n: number) => n.toLocaleString('en-US');
  if (min !== undefined && max !== undefined) return `Red when ≤ ${fmt(min)} or > ${fmt(max)}`;
  if (min !== undefined) return `Red when ≤ ${fmt(min)}`;
  if (max !== undefined) return `Red when > ${fmt(max)}`;
  return null;
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
