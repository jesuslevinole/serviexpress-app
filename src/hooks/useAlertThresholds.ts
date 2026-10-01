import { useEffect, useState } from 'react';
import {
  ALERT_EXEMPT_KEYS,
  DEFAULT_THRESHOLDS,
  alertRule,
  subscribeAlertThresholds,
  type AlertThresholds,
} from '../services/alertThresholds';
import type { FieldConfig, FieldValue } from '../types/models';

/* Suscripción COMPARTIDA a nivel de módulo: por muchos componentes que
 * pidan los umbrales (tablas, detalle, listas relacionadas, dashboard),
 * Firestore mantiene un solo canal y una sola copia en memoria. */
let sharedThresholds: AlertThresholds = { ...DEFAULT_THRESHOLDS };
const thresholdListeners = new Set<(t: AlertThresholds) => void>();
let thresholdsStarted = false;

function ensureThresholdsSubscription() {
  if (thresholdsStarted) return;
  thresholdsStarted = true;
  subscribeAlertThresholds((values) => {
    sharedThresholds = values;
    thresholdListeners.forEach((listener) => listener(values));
  });
}

/** Umbrales de alerta vivos (1 documento chico, compartido por suscripción). */
export function useAlertThresholds(): AlertThresholds {
  const [thresholds, setThresholds] = useState<AlertThresholds>(sharedThresholds);
  useEffect(() => {
    ensureThresholdsSubscription();
    const listener = (values: AlertThresholds) => setThresholds(values);
    thresholdListeners.add(listener);
    setThresholds(sharedThresholds);
    return () => {
      thresholdListeners.delete(listener);
    };
  }, []);
  return thresholds;
}

/** ¿Este valor numérico debe pintarse en rojo según el umbral del campo? */
export function isAlertValue(
  field: FieldConfig,
  value: FieldValue,
  thresholds: AlertThresholds,
): boolean {
  if (field.type !== 'number') return false;
  if (ALERT_EXEMPT_KEYS.has(field.key)) return false;
  const { min, max } = alertRule(field.key, thresholds);
  if (min === undefined && max === undefined) return false;
  if (value === null || value === undefined || value === '') return false;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return false;
  // Rojo si está en o bajo el MÍNIMO, o si pasa del MÁXIMO permitido.
  return (min !== undefined && numeric <= min) || (max !== undefined && numeric > max);
}
