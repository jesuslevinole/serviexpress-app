import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { SaveSummary } from './SaveSummary';
import type { SelectOption } from '../ui/SearchableSelect';
import type { RefMaps } from '../../hooks/useRefMaps';
import type { EntityData, FieldConfig, FieldValue } from '../../types/models';
import './CrudForm.css';

interface CrudFormProps {
  open: boolean;
  title: string;
  fields: FieldConfig[];
  initial: EntityData | null;
  refMaps: RefMaps;
  busy: boolean;
  error: string | null;
  /** Se incrementa cuando un "Guardar y agregar otro" fue exitoso: limpia el formulario. */
  resetSignal: number;
  onClose: () => void;
  onSubmit: (values: Record<string, FieldValue>, keepOpen: boolean) => void;
}

function buildInitialValues(fields: FieldConfig[], initial: EntityData | null) {
  const values: Record<string, FieldValue> = {};
  fields.forEach((field) => {
    if (initial && field.key in initial) {
      values[field.key] = initial[field.key];
    } else if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue;
    } else if (field.type === 'bool') {
      values[field.key] = false;
    } else if (field.type === 'date' && field.required) {
      values[field.key] = new Date().toISOString().slice(0, 10);
    } else {
      values[field.key] = field.type === 'number' || field.type === 'currency' ? null : '';
    }
  });
  return values;
}

function isEmpty(value: FieldValue): boolean {
  return value === null || value === '' || value === undefined;
}

/**
 * Formulario modal genérico: valida requeridos con resaltado rojo
 * y bloquea el guardado hasta que estén completos.
 */
export function CrudForm({
  open,
  title,
  fields,
  initial,
  refMaps,
  busy,
  error,
  resetSignal,
  onClose,
  onSubmit,
}: CrudFormProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [touchedSubmit, setTouchedSubmit] = useState(false);

  /** Campos que sí se capturan (los form:false los llena el sistema). */
  const formFields = useMemo(() => fields.filter((f) => f.form !== false), [fields]);

  useEffect(() => {
    if (open) {
      setValues(buildInitialValues(formFields, initial));
      setTouchedSubmit(false);
    }
  }, [open, formFields, initial, resetSignal]);

  const refOptionsByField = useMemo(() => {
    const map: Record<string, SelectOption[]> = {};
    formFields.forEach((field) => {
      if (field.type !== 'ref' || !field.refCollection) return;
      const refData = refMaps[field.refCollection];
      if (!refData) {
        map[field.key] = [];
        return;
      }
      let rows = refData.rows;
      if (field.refFilter) {
        rows = rows.filter((r) => r[field.refFilter!.field] === field.refFilter!.value);
      }
      map[field.key] = rows
        .map((r) => ({ value: r.id, label: refData.labels.get(r.id) ?? r.id }))
        .sort((a, b) => a.label.localeCompare(b.label));
    });
    return map;
  }, [formFields, refMaps]);

  const missing = useMemo(
    () => formFields.filter((f) => f.required && isEmpty(values[f.key])).map((f) => f.key),
    [formFields, values],
  );

  const handleChange = (key: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (keepOpen: boolean) => {
    setTouchedSubmit(true);
    if (missing.length > 0) return;
    onSubmit(values, keepOpen);
  };

  const refLabel = (collection: string, id: string): string =>
    refMaps[collection]?.labels.get(id) ?? '—';

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {error ? <span className="crudform-error">{error}</span> : null}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          {initial === null ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleSubmit(true)}
              disabled={busy}
            >
              {busy ? 'Guardando…' : 'Guardar y agregar otro'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSubmit(false)}
            disabled={busy}
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="crudform-layout">
        <div className="crudform-grid">
          {formFields.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={values[field.key] ?? null}
              invalid={touchedSubmit && missing.includes(field.key)}
              refOptions={refOptionsByField[field.key] ?? []}
              onChange={handleChange}
            />
          ))}
        </div>
        <SaveSummary fields={formFields} values={values} refLabels={refLabel} />
      </div>
    </Modal>
  );
}