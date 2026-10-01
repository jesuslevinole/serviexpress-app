import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import {
  saveAlertThresholds,
  ALERT_EXEMPT_KEYS,
  DEFAULT_THRESHOLDS,
  MAX_SUFFIX,
  DIR_SUFFIX,
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

interface Entry {
  /** Máximo que acepta el campo. */
  max: string;
  /** Valor en el que se pone rojo. */
  redAt: string;
  /** 'lower' = rojo con ese valor o menos; 'higher' = con ese valor o más. */
  direction: 'lower' | 'higher';
}

const EMPTY: Entry = { max: '', redAt: '', direction: 'lower' };

const num = (raw: string): number | null => {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** La regla en una frase, en vivo, tal como la entenderá cualquiera. */
function sentence(entry: Entry): { text: string; on: boolean } {
  const max = num(entry.max);
  const redAt = num(entry.redAt);
  const fmt = (n: number) => n.toLocaleString('en-US');
  const parts: string[] = [];
  if (max !== null) parts.push(`It does not accept more than ${fmt(max)}.`);
  if (redAt !== null) {
    parts.push(
      entry.direction === 'lower'
        ? `It turns red when it goes down to ${fmt(redAt)} or less.`
        : `It turns red when it goes up to ${fmt(redAt)} or more.`,
    );
  }
  return parts.length > 0 ? { text: parts.join(' '), on: redAt !== null } : { text: 'No limit and no alert.', on: false };
}

/**
 * Configuración de alertas (solo admin). Por cada campo numérico:
 *  1. Maximum value: lo más alto que acepta el campo (el formulario no deja guardar más).
 *  2. Turns red at: el valor en el que la casilla se pinta en rojo, y si el
 *     rojo es al BAJAR (ese valor o menos) o al SUBIR (ese valor o más).
 * Aplica para todos: tablas, detalle y Excel.
 */
export function AlertThresholdsModal({
  config,
  current,
  byUid,
  onClose,
}: AlertThresholdsModalProps) {
  const fields = useMemo(() => numericFields(config), [config]);
  const [values, setValues] = useState<Record<string, Entry>>(() => {
    const map: Record<string, Entry> = {};
    fields.forEach((field) => {
      map[field.key] = {
        max: asText(current[field.key + MAX_SUFFIX]),
        redAt: asText(current[field.key]),
        direction: current[field.key + DIR_SUFFIX] === 1 ? 'higher' : 'lower',
      };
    });
    return map;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPart = <K extends keyof Entry>(key: string, part: K, value: Entry[K]) =>
    setValues((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY), [part]: value } }));

  const handleSave = async () => {
    for (const field of fields) {
      const entry = values[field.key] ?? EMPTY;
      const max = num(entry.max);
      const redAt = num(entry.redAt);
      if (max !== null && redAt !== null && redAt > max) {
        setError(
          `${field.label}: the red value (${redAt}) cannot be higher than the maximum the field accepts (${max}).`,
        );
        return;
      }
    }
    setBusy(true);
    setError(null);
    const managed = new Set(
      fields.flatMap((f) => [f.key, f.key + MAX_SUFFIX, f.key + DIR_SUFFIX]),
    );
    const payload: Record<string, number | null> = {};
    // Se conservan los umbrales de otros módulos que no aparecen aquí.
    Object.entries(current).forEach(([key, value]) => {
      if (!managed.has(key)) payload[key] = value;
    });
    fields.forEach((field) => {
      const entry = values[field.key] ?? EMPTY;
      const max = num(entry.max);
      const redAt = num(entry.redAt);
      if (redAt === null) {
        // Vacío: sin rojo. Si era de fábrica, se anula explícitamente.
        if (DEFAULT_THRESHOLDS[field.key] !== undefined) payload[field.key] = null;
      } else {
        payload[field.key] = redAt;
        if (entry.direction === 'higher') payload[field.key + DIR_SUFFIX] = 1;
      }
      if (max !== null) payload[field.key + MAX_SUFFIX] = max;
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
        <div className="alerts-cfg-hint">
          <p>For each field you can set:</p>
          <ol>
            <li>
              <strong>Maximum value</strong> — the highest number the field accepts. If someone
              types more, the record is not saved.
            </li>
            <li>
              <strong>Turns red at</strong> — the number where the box turns{' '}
              <span className="num-alert">red</span>, and whether it gets there going{' '}
              <strong>down</strong> (that number or less — e.g. tires) or going{' '}
              <strong>up</strong> (that number or more).
            </li>
          </ol>
          <p>
            Example: maximum <strong>6</strong>, red at <strong>1</strong> going down → accepts 0 to
            6 and shows red at 1 or 0. Leave a box empty for no limit. It applies to every table,
            the record detail and the Excel export, for everyone.
          </p>
        </div>
        <ul>
          {fields.map((field) => {
            const entry = values[field.key] ?? EMPTY;
            const rule = sentence(entry);
            return (
              <li key={field.key}>
                <div className="alerts-cfg-head">
                  <span className="alerts-cfg-label">{field.label}</span>
                </div>
                <div className="alerts-cfg-inputs">
                  <label>
                    Maximum value
                    <input
                      type="number"
                      className="field-input"
                      value={entry.max}
                      placeholder="No limit"
                      onChange={(e) => setPart(field.key, 'max', e.target.value)}
                    />
                  </label>
                  <label>
                    Turns red at
                    <input
                      type="number"
                      className="field-input"
                      value={entry.redAt}
                      placeholder="No alert"
                      onChange={(e) => setPart(field.key, 'redAt', e.target.value)}
                    />
                  </label>
                  <label>
                    Going
                    <select
                      className="field-input"
                      value={entry.direction}
                      onChange={(e) =>
                        setPart(field.key, 'direction', e.target.value === 'higher' ? 'higher' : 'lower')
                      }
                    >
                      <option value="lower">Down (that number or less)</option>
                      <option value="higher">Up (that number or more)</option>
                    </select>
                  </label>
                </div>
                <p className={`alerts-cfg-rule${rule.on ? ' is-on' : ''}`}>{rule.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
