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
};

export type AlertThresholds = Record<string, number>;

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
