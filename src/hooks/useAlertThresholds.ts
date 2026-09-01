import { useEffect, useState } from 'react';
import {
  DEFAULT_THRESHOLDS,
  subscribeAlertThresholds,
  type AlertThresholds,
} from '../services/alertThresholds';
import type { FieldConfig, FieldValue } from '../types/models';

/** Umbrales de alerta vivos (1 documento chico, compartido por suscripción). */
export function useAlertThresholds(): AlertThresholds {
  const [thresholds, setThresholds] = useState<AlertThresholds>({ ...DEFAULT_THRESHOLDS });
  useEffect(() => subscribeAlertThresholds(setThresholds), []);
  return thresholds;
}

/** ¿Este valor numérico debe pintarse en rojo según el umbral del campo? */
export function isAlertValue(
  field: FieldConfig,
  value: FieldValue,
  thresholds: AlertThresholds,
): boolean {
  if (field.type !== 'number') return false;
  const limit = thresholds[field.key];
  if (limit === undefined) return false;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric <= limit;
}
