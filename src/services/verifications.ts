import { createDocument, fetchDocumentsWhere } from './firestoreService';
import type { EntityData } from '../types/models';

/**
 * Verificaciones de un registro (el check de "información correcta"). Cada
 * persona con permiso puede dejar la suya: queda el historial completo, no
 * solo la última. Si el resultado NO es "todo bien", la nota es obligatoria.
 */
export const VERIFICATIONS_COLLECTION = 'verifications';

export type VerificationResult = 'ok' | 'issues' | 'wrong';

export const VERIFICATION_LABEL: Record<VerificationResult, string> = {
  ok: 'Everything is correct',
  issues: 'Something is wrong',
  wrong: 'All the information is wrong',
};

export interface VerificationEntry {
  id: string;
  recordId: string;
  collection: string;
  result: VerificationResult;
  note: string;
  byUid: string;
  byName: string;
  createdAt: string | null;
}

export async function addVerification(entry: {
  collection: string;
  recordId: string;
  result: VerificationResult;
  note: string;
  byUid: string;
  byName: string;
}): Promise<void> {
  await createDocument(VERIFICATIONS_COLLECTION, {
    collection: entry.collection,
    recordId: entry.recordId,
    result: entry.result,
    note: entry.note,
    byUid: entry.byUid,
    byName: entry.byName,
  });
}

/** Historial de verificaciones de un registro, de la más reciente a la más vieja. */
export async function fetchVerifications(recordId: string): Promise<VerificationEntry[]> {
  const rows: EntityData[] = await fetchDocumentsWhere(VERIFICATIONS_COLLECTION, {
    field: 'recordId',
    value: recordId,
  });
  return rows
    .map(
      (row): VerificationEntry => ({
        id: row.id,
        recordId: typeof row.recordId === 'string' ? row.recordId : '',
        collection: typeof row.collection === 'string' ? row.collection : '',
        result:
          row.result === 'issues' || row.result === 'wrong'
            ? row.result
            : 'ok',
        note: typeof row.note === 'string' ? row.note : '',
        byUid: typeof row.byUid === 'string' ? row.byUid : '',
        byName: typeof row.byName === 'string' ? row.byName : '—',
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
      }),
    )
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}
