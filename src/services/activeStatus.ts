import { COLLECTIONS } from '../config/collections';
import type { EntityData } from '../types/models';

/**
 * ¿El registro del catálogo sigue activo? Acepta bool o los textos migrados
 * de AppSheet. Sin campo o sin valor se considera activo.
 */
export function isActiveRecord(row: EntityData, key: string | undefined): boolean {
  if (!key) return true;
  const value = row[key];
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return !['INACTIVO', 'INACTIVE', 'BAJA', 'NO'].includes(value.toUpperCase());
  }
  return true;
}

/**
 * Colecciones con marca de activo/inactivo y su campo. Los registros
 * inactivos de estas colecciones NO aparecen en ningún desplegable (pero su
 * nombre sigue resolviéndose en los registros viejos que ya los referencian).
 */
export const ACTIVE_FLAG_BY_COLLECTION: Record<string, string> = {
  [COLLECTIONS.drivers]: 'status',
  [COLLECTIONS.trucks]: 'status',
  [COLLECTIONS.assets]: 'status',
};
