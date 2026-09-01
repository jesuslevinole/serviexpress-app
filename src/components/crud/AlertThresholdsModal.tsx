import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { saveAlertThresholds, DEFAULT_THRESHOLDS } from '../../services/alertThresholds';
import type { AlertThresholds } from '../../services/alertThresholds';
import type { FieldConfig, ModuleConfig } from '../../types/models';
import './AlertThresholdsModal.css';

interface AlertThresholdsModalProps {
  config: ModuleConfig;
  current: AlertThresholds;
  byUid: string | null;
  onClose: () => void;
}

/** Campos numéricos del módulo y de su detalle (los que pueden alertar). */
function numericFields(config: ModuleConfig): FieldConfig[] {
  const seen = new Set<string>();
  const out: FieldConfig[] = [];
  [...config.fields, ...(config.detail?.fields ?? [])].forEach((field) => {
    if (field.type !== 'number' || field.compute !== undefined) return;
    if (seen.has(field.key)) return;
    seen.add(field.key);
    out.push(field);
  });
  return out;
}

/**
 * Configuración de alertas (solo admin): para cada campo numérico, el número
 * a partir del cual la casilla se pinta en ROJO (valor <= umbral). "Diff
 * mileage" viene de fábrica en 0; los cauchos se configuran aquí. Vacío =
 * sin alerta. Aplica para todos los usuarios, en todas las tablas.
 */
export function AlertThresholdsModal({
  config,
  current,
  byUid,
  onClose,
}: AlertThresholdsModalProps) {
  const fields = useMemo(() => numericFields(config), [config]);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    fields.forEach((field) => {
      map[field.key] = current[field.key] !== undefined ? String(current[field.key]) : '';
    });
    return map;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    const payload: Record<string, number | null> = {};
    // Se conservan los umbrales de otros módulos que no aparecen aquí.
    Object.entries(current).forEach(([key, value]) => {
      if (!fields.some((f) => f.key === key)) payload[key] = value;
    });
    fields.forEach((field) => {
      const raw = values[field.key]?.trim() ?? '';
      if (raw === '') {
        // Vacío: sin alerta. Si era de fábrica, se anula explícitamente.
        if (DEFAULT_THRESHOLDS[field.key] !== undefined) payload[field.key] = null;
        return;
      }
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) payload[field.key] = numeric;
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
      size="sm"
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
          A number <strong>at or below</strong> the limit shows in <span className="num-alert">red</span>{' '}
          in every table, for everyone. Leave a limit empty for no alert.
        </p>
        <ul>
          {fields.map((field) => (
            <li key={field.key}>
              <span className="alerts-cfg-label">{field.label}</span>
              <label>
                Red when ≤
                <input
                  type="number"
                  value={values[field.key] ?? ''}
                  placeholder="—"
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
