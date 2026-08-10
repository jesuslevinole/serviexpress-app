import { useState } from 'react';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { createDocument } from '../../services/firestoreService';
import type { FieldConfig, FieldValue } from '../../types/models';

interface QuickAddRefModalProps {
  /** Colección del catálogo donde se dará de alta el registro. */
  collection: string;
  /** Título del catálogo, para el encabezado del diálogo. */
  title: string;
  /** Campos del catálogo (normalmente solo Name). */
  fields: FieldConfig[];
  /** Texto ya escrito en el buscador, para no volver a teclearlo. */
  initialName?: string;
  /** Devuelve el id recién creado para seleccionarlo en el campo de origen. */
  onCreated: (id: string) => void;
  onClose: () => void;
}

/**
 * Alta rápida de un registro de catálogo desde cualquier formulario: evita
 * salir a Catálogos, crearlo y volver a empezar la captura.
 */
export function QuickAddRefModal({
  collection,
  title,
  fields,
  initialName = '',
  onCreated,
  onClose,
}: QuickAddRefModalProps) {
  const formFields = fields.filter((field) => field.form !== false && field.readOnly !== true);

  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const initial: Record<string, FieldValue> = {};
    formFields.forEach((field) => {
      initial[field.key] =
        field.key === 'name' && initialName !== ''
          ? initialName
          : field.type === 'number' || field.type === 'currency'
            ? null
            : '';
    });
    return initial;
  });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = formFields
    .filter((field) => field.required && (values[field.key] ?? '') === '')
    .map((field) => field.key);

  const handleSave = async () => {
    setTouched(true);
    if (missing.length > 0) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createDocument(collection, values);
      onCreated(id);
    } catch {
      setError('The record could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      layer="top"
      title={`New · ${title}`}
      onClose={onClose}
      size="sm"
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
      <div className="crudform-grid">
        {formFields.map((field) => (
          <FormField
            key={field.key}
            field={field}
            value={values[field.key] ?? null}
            invalid={touched && missing.includes(field.key)}
            refOptions={[]}
            onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          />
        ))}
      </div>
      {error ? <p className="crud-error">{error}</p> : null}
    </Modal>
  );
}
