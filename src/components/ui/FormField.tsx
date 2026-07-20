import { SearchableSelect, type SelectOption } from './SearchableSelect';
import type { FieldConfig, FieldValue } from '../../types/models';
import './FormField.css';

interface FormFieldProps {
  field: FieldConfig;
  value: FieldValue;
  invalid: boolean;
  refOptions: SelectOption[];
  onChange: (key: string, value: FieldValue) => void;
}

/**
 * Renderiza el control correcto según el tipo del campo.
 * Un solo componente para todos los formularios del app.
 */
export function FormField({ field, value, invalid, refOptions, onChange }: FormFieldProps) {
  const inputClass = `field-input ${invalid ? 'field-invalid' : ''}`;

  const renderControl = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className={inputClass}
            rows={3}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );
      case 'number':
      case 'currency':
        return (
          <input
            className={inputClass}
            type="number"
            step={field.type === 'currency' ? '0.01' : '1'}
            value={typeof value === 'number' ? value : value === null ? '' : String(value)}
            onChange={(e) =>
              onChange(field.key, e.target.value === '' ? null : Number(e.target.value))
            }
          />
        );
      case 'date':
        return (
          <input
            className={inputClass}
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );
      case 'bool':
        return (
          <label className="field-check">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
            <span>Sí</span>
          </label>
        );
      case 'enum':
        return (
          <SearchableSelect
            value={typeof value === 'string' ? value : ''}
            invalid={invalid}
            options={(field.enumValues ?? []).map((v) => ({ value: v, label: v }))}
            onChange={(v) => onChange(field.key, v)}
          />
        );
      case 'ref':
        return (
          <SearchableSelect
            value={typeof value === 'string' ? value : ''}
            invalid={invalid}
            options={refOptions}
            onChange={(v) => onChange(field.key, v)}
          />
        );
      default:
        return (
          <input
            className={inputClass}
            type="text"
            value={typeof value === 'string' ? value : value === null ? '' : String(value)}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );
    }
  };

  return (
    <div className={`field ${field.type === 'textarea' ? 'field-full' : ''}`}>
      <label className="field-label">
        {field.label}
        {field.required ? <span className="field-required">*</span> : null}
      </label>
      {renderControl()}
      {invalid ? <span className="field-error">Este campo es obligatorio</span> : null}
    </div>
  );
}
