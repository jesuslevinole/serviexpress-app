import { useMemo, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';
import { displayValue } from './displayValue';
import type { FieldConfig, FieldValue } from '../../types/models';
import './SaveSummary.css';

interface SaveSummaryProps {
  /** Campos del formulario (en el mismo orden en que se capturan). */
  fields: FieldConfig[];
  /** Valores actuales del formulario. */
  values: Record<string, FieldValue>;
  /** Resolución id -> nombre para refs. */
  refLabels: (collection: string, id: string) => string;
  /** Contenido extra opcional al pie (p. ej. permisos activos en Roles). */
  footer?: ReactNode;
}

function isEmpty(value: FieldValue | undefined): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Sumario en vivo del registro en captura: muestra de forma resumida y
 * ordenada la información que se va llenando en el formulario, con el
 * avance de campos y el estado de los obligatorios.
 */
export function SaveSummary({ fields, values, refLabels, footer }: SaveSummaryProps) {
  const filled = useMemo(
    () =>
      fields
        .filter((field) => !isEmpty(values[field.key]))
        .map((field) => ({
          key: field.key,
          label: field.label,
          value: displayValue(field, values[field.key] ?? null, refLabels),
          long: field.type === 'textarea',
        })),
    [fields, values, refLabels],
  );

  const requiredFields = fields.filter((f) => f.required);
  const requiredMissing = requiredFields.filter((f) => isEmpty(values[f.key])).length;

  return (
    <aside className="ssum" aria-label="Record summary">
      <div className="ssum-header">
        <span className="ssum-header-icon">
          <ClipboardList size={15} />
        </span>
        <strong>Record summary</strong>
      </div>

      <div className="ssum-progress">
        <div className="ssum-progress-bar">
          <span
            className="ssum-progress-fill"
            data-width={Math.round((filled.length / Math.max(fields.length, 1)) * 100)}
            ref={(el) => {
              if (el) {
                el.style.setProperty(
                  '--fill',
                  `${Math.round((filled.length / Math.max(fields.length, 1)) * 100)}%`,
                );
              }
            }}
          />
        </div>
        <span className="ssum-progress-text">
          {filled.length} of {fields.length} fields
        </span>
      </div>

      {requiredFields.length > 0 ? (
        requiredMissing > 0 ? (
          <p className="ssum-required is-missing">
            <AlertCircle size={13} />
            {requiredMissing === 1
              ? '1 required field missing'
              : `${requiredMissing} required fields missing`}
          </p>
        ) : (
          <p className="ssum-required is-ok">
            <CheckCircle2 size={13} />
            Required fields complete
          </p>
        )
      ) : null}

      {filled.length === 0 ? (
        <p className="ssum-empty">Start filling the form and the summary will appear here.</p>
      ) : (
        <dl className="ssum-list">
          {filled.map((item) => (
            <div key={item.key} className="ssum-item">
              <dt>{item.label}</dt>
              <dd className={item.long ? 'is-long' : ''}>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {footer ? <div className="ssum-footer">{footer}</div> : null}
    </aside>
  );
}
