import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import {
  saveAlertThresholds,
  ALERT_EXEMPT_KEYS,
  DEFAULT_THRESHOLDS,
  MAX_SUFFIX,
} from '../../services/alertThresholds';
import type { AlertThresholds } from '../../services/alertThresholds';
import type { FieldConfig, ModuleConfig } from '../../types/models';
import './AlertThresholdsModal.css';

interface AlertThresholdsModalProps {
  config: ModuleConfig;
  current: AlertThresholds;
  byUid: string | null;
  onClose: () => void;
}

/** Campos numéricos del módulo y de su detalle (los que pueden alertar), incluidos los calculados (Difference mileage). */
function numericFields(config: ModuleConfig): FieldConfig[] {
  const seen = new Set<string>();
  const out: FieldConfig[] = [];
  [...config.fields, ...(config.detail?.fields ?? [])].forEach((field) => {
    if (field.type !== 'number') return;
    if (ALERT_EXEMPT_KEYS.has(field.key)) return;
    if (seen.has(field.key)) return;
    seen.add(field.key);
    out.push(field);
  });
  return out;
}

/** Texto de un número guardado ("" si no hay). */
const asText = (value: number | undefined) => (value !== undefined ? String(value) : '');

/** Regla en palabras a partir de lo tecleado (vista previa en vivo). */
function previewRule(minRaw: string, maxRaw: string): string {
  const min = minRaw.trim() === '' ? null : Number(minRaw);
  const max = maxRaw.trim() === '' ? null : Number(maxRaw);
  const ok = (n: number | null): n is number => n !== null && Number.isFinite(n);
  const fmt = (n: number) => n.toLocaleString('en-US');
  if (ok(min) && ok(max)) return `Red when ${fmt(min)} or less, or above ${fmt(max)}`;
  if (ok(min)) return `Red when ${fmt(min)} or less`;
  if (ok(max)) return `Red when above ${fmt(max)}`;
  return 'No alert';
}

/**
 * Configuración de alertas (solo admin): para cada campo numérico, un
 * MÍNIMO (en o bajo él, rojo) y un VALOR MÁXIMO permitido (por encima, rojo).
 * Vacío = sin ese límite. Aplica para todos, en todas las tablas y en Excel.
 */
export function AlertThresholdsModal({
  config,
  current,
  byUid,
  onClose,
}: AlertThresholdsModalProps) {
  const fields = useMemo(() => numericFields(config), [config]);
  const [values, setValues] = useState<Record<string, { min: string; max: string }>>(() => {
    const map: Record<string, { min: string; max: string }> = {};
    fields.forEach((field) => {
      map[field.key] = {
        min: asText(current[field.key]),
        max: asText(current[field.key + MAX_SUFFIX]),
      };
    });
    return map;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPart = (key: string, part: 'min' | 'max', raw: string) =>
    setValues((prev) => ({ ...prev, [key]: { ...(prev[key] ?? { min: '', max: '' }), [part]: raw } }));

  const handleSave = async () => {
    // Un máximo menor o igual al mínimo no tiene sentido: todo saldría rojo.
    for (const field of fields) {
      const { min, max } = values[field.key] ?? { min: '', max: '' };
      if (min.trim() !== '' && max.trim() !== '' && Number(max) <= Number(min)) {
        setError(`${field.label}: the maximum must be greater than the minimum.`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    const managed = new Set(fields.flatMap((f) => [f.key, f.key + MAX_SUFFIX]));
    const payload: Record<string, number | null> = {};
    // Se conservan los umbrales de otros módulos que no aparecen aquí.
    Object.entries(current).forEach(([key, value]) => {
      if (!managed.has(key)) payload[key] = value;
    });
    fields.forEach((field) => {
      const { min, max } = values[field.key] ?? { min: '', max: '' };
      if (min.trim() === '') {
        // Vacío: sin mínimo. Si era de fábrica, se anula explícitamente.
        if (DEFAULT_THRESHOLDS[field.key] !== undefined) payload[field.key] = null;
      } else if (Number.isFinite(Number(min))) {
        payload[field.key] = Number(min);
      }
      if (max.trim() !== '' && Number.isFinite(Number(max))) {
        payload[field.key + MAX_SUFFIX] = Number(max);
      }
    });
    try {
      await saveAlertThresholds(payload, byUid);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? `It could not be saved: ${err.message}` : 'Save error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Alerts · ${config.title}`}
      onClose={onClose}
      size="md"
      layer="top"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="alerts-cfg">
        {error ? <p className="alerts-cfg-error">{error}</p> : null}
        <p className="alerts-cfg-hint">
          For each field set a <strong>minimum</strong> (a value at or below it shows in{' '}
          <span className="num-alert">red</span>) and/or the <strong>maximum allowed</strong>{' '}
          (a value above it shows in <span className="num-alert">red</span>). It applies to every
          table, the record detail and the Excel export, for everyone. Leave a box empty for no
          limit.
        </p>
        <ul>
          {fields.map((field) => {
            const entry = values[field.key] ?? { min: '', max: '' };
            const rule = previewRule(entry.min, entry.max);
            return (
              <li key={field.key}>
                <div className="alerts-cfg-head">
                  <span className="alerts-cfg-label">{field.label}</span>
                  <span className={`alerts-cfg-rule${rule === 'No alert' ? '' : ' is-on'}`}>{rule}</span>
                </div>
                <div className="alerts-cfg-inputs">
                  <label>
                    Minimum (red when ≤)
                    <input
                      type="number"
                      className="field-input"
                      value={entry.min}
                      placeholder="—"
                      onChange={(e) => setPart(field.key, 'min', e.target.value)}
                    />
                  </label>
                  <label>
                    Maximum allowed (red when &gt;)
                    <input
                      type="number"
                      className="field-input"
                      value={entry.max}
                      placeholder="—"
                      onChange={(e) => setPart(field.key, 'max', e.target.value)}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
