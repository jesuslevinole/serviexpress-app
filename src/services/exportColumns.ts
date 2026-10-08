import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../config/collections';

/**
 * Columnas que cada persona decidió NO sacar en el Excel de un módulo.
 * Se guardan las EXCLUIDAS (no las elegidas): una columna nueva que se
 * agregue al módulo más adelante sale marcada sin tener que reconfigurar.
 *
 * Vive en el documento del usuario (users/<uid>.exportColumns.<moduleId>),
 * así le sigue en cualquier equipo. Copia local de respaldo por si la
 * lectura o la escritura en Firestore fallan (sin conexión, reglas).
 */
const LOCAL_PREFIX = 'sx_export_cols_';

function localKey(uid: string, moduleId: string) {
  return `${LOCAL_PREFIX}${uid}_${moduleId}`;
}

function readLocal(uid: string, moduleId: string): string[] | null {
  try {
    const raw = globalThis.localStorage?.getItem(localKey(uid, moduleId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null;
  } catch {
    return null;
  }
}

function writeLocal(uid: string, moduleId: string, excluded: string[]) {
  try {
    globalThis.localStorage?.setItem(localKey(uid, moduleId), JSON.stringify(excluded));
  } catch {
    /* sin almacenamiento local */
  }
}

/** Columnas excluidas guardadas; null = nunca se ha guardado una selección. */
export async function loadExcludedColumns(uid: string, moduleId: string): Promise<string[] | null> {
  if (uid === '') return null;
  try {
    const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
    const map = snapshot.data()?.exportColumns as Record<string, unknown> | undefined;
    const value = map?.[moduleId];
    if (Array.isArray(value)) {
      const list = value.filter((v): v is string => typeof v === 'string');
      writeLocal(uid, moduleId, list);
      return list;
    }
  } catch (err) {
    console.warn('[export-columns] could not read the saved selection, using local copy', err);
  }
  return readLocal(uid, moduleId);
}

/** Guarda la selección. Devuelve true si quedó en la cuenta (cualquier equipo). */
export async function saveExcludedColumns(
  uid: string,
  moduleId: string,
  excluded: string[],
): Promise<boolean> {
  if (uid === '') return false;
  writeLocal(uid, moduleId, excluded);
  try {
    await updateDoc(doc(db, COLLECTIONS.users, uid), { [`exportColumns.${moduleId}`]: excluded });
    return true;
  } catch (err) {
    console.warn('[export-columns] saved only on this device', err);
    return false;
  }
}
