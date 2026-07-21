import type { FieldConfig, FieldValue } from '../../types/models';

function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'USD' });
}

/** Convierte el valor crudo en texto visible (resuelve refs, montos, booleanos). */
export function displayValue(
  field: FieldConfig,
  value: FieldValue,
  refLabels: (collection: string, id: string) => string,
): string {
  if (value === null || value === '' || value === undefined) return '—';
  switch (field.type) {
    case 'ref':
      return field.refCollection ? refLabels(field.refCollection, String(value)) : String(value);
    case 'bool':
      return value === true ? 'Yes' : 'No';
    case 'currency':
      return typeof value === 'number' ? formatCurrency(value) : String(value);
    default:
      return String(value);
  }
}
