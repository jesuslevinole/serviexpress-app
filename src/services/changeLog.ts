import { createDocument, fetchDocumentsWhere } from './firestoreService';
import type { EntityData, FieldConfig, FieldValue } from '../types/models';

/** Colección de la bitácora de cambios (auditoría de todo el app). */
export const CHANGE_LOG_COLLECTION = 'change_log';

export interface ChangeEntryField {
  key: string;
  label: string;
  /** Valores YA legibles (referencias resueltas, fechas MM/DD/YYYY). */
  from: string;
  to: string;
}

export interface ChangeEntry {
  id: string;
  createdAt: string | null;
  collection: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  moduleTitle: string;
  /** Etiqueta legible del registro al momento del cambio. */
  recordLabel: string;
  byUid: string;
  /** Nombre del usuario REAL que hizo el cambio (con "(as X)" si simulaba). */
  byName: string;
  changes: ChangeEntryField[];
}

/**
 * Diferencias campo a campo entre lo que había y lo que se guardó, con los
 * valores resueltos a texto legible al MOMENTO del cambio (si mañana borran
 * la estación del catálogo, la bitácora conserva su nombre).
 */
export function buildFieldChanges(
  fields: FieldConfig[],
  before: EntityData | null,
  payload: Record<string, FieldValue>,
  display: (field: FieldConfig, value: FieldValue) => string,
): ChangeEntryField[] {
  const changes: ChangeEntryField[] = [];
  fields.forEach((field) => {
    if (field.compute !== undefined) return;
    if (!(field.key in payload)) return;
    const previous = before ? ((before[field.key] as FieldValue) ?? null) : null;
    const next = payload[field.key] ?? null;
    if (previous === next) return;
    // Igualdad laxa para vacíos: '' y null son "sin dato" por igual.
    const emptyPrev = previous === null || previous === '';
    const emptyNext = next === null || next === '';
    if (emptyPrev && emptyNext) return;
    changes.push({
      key: field.key,
      label: field.label,
      from: emptyPrev ? '—' : display(field, previous),
      to: emptyNext ? '—' : display(field, next),
    });
  });
  return changes;
}

/**
 * Escribe una entrada de auditoría. Nunca interrumpe el guardado del
 * registro: si la bitácora falla (sin red, sin cuota), se registra en
 * consola y la operación del usuario sigue su curso.
 */
export async function logRecordChange(entry: {
  collection: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  moduleTitle: string;
  recordLabel: string;
  byUid: string;
  byName: string;
  changes: ChangeEntryField[];
}): Promise<void> {
  try {
    await createDocument(CHANGE_LOG_COLLECTION, {
      collection: entry.collection,
      recordId: entry.recordId,
      action: entry.action,
      moduleTitle: entry.moduleTitle,
      recordLabel: entry.recordLabel,
      byUid: entry.byUid,
      byName: entry.byName,
      changes: JSON.stringify(entry.changes),
    });
  } catch (error) {
    console.error('[change-log] entry could not be written', error);
  }
}

/** Historial de UN registro, del más reciente al más viejo. */
export async function fetchRecordHistory(recordId: string): Promise<ChangeEntry[]> {
  const rows = await fetchDocumentsWhere(CHANGE_LOG_COLLECTION, {
    field: 'recordId',
    value: recordId,
  });
  return rows
    .map(
      (row): ChangeEntry => ({
        id: row.id,
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
        collection: typeof row.collection === 'string' ? row.collection : '',
        recordId: typeof row.recordId === 'string' ? row.recordId : '',
        action:
          row.action === 'create' || row.action === 'delete'
            ? row.action
            : 'update',
        moduleTitle: typeof row.moduleTitle === 'string' ? row.moduleTitle : '',
        recordLabel: typeof row.recordLabel === 'string' ? row.recordLabel : '',
        byUid: typeof row.byUid === 'string' ? row.byUid : '',
        byName: typeof row.byName === 'string' ? row.byName : '—',
        changes: safeParseChanges(row.changes),
      }),
    )
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

function safeParseChanges(raw: unknown): ChangeEntryField[] {
  if (typeof raw !== 'string' || raw === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChangeEntryField[]) : [];
  } catch {
    return [];
  }
}
