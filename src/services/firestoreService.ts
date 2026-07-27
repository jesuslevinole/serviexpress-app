import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { EntityData, FieldValue } from '../types/models';

/** Normaliza un valor crudo de Firestore al tipo FieldValue del app. */
function normalizeValue(value: unknown): FieldValue | string[] {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'object') {
    // Objetos anidados (p. ej. la matriz de permisos de un rol): se conservan
    // como JSON para que las pantallas puedan reconstruirlos al leer.
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Convierte un documento de Firestore en EntityData tipado. */
export function toEntity(id: string, data: DocumentData): EntityData {
  const entity: EntityData = { id };
  for (const [key, value] of Object.entries(data)) {
    entity[key] = normalizeValue(value);
  }
  return entity;
}

export interface CollectionFilter {
  field: string;
  value: FieldValue;
}

/** Suscripción en tiempo real a una colección, con filtro opcional. */
export function subscribeToCollection(
  collectionName: string,
  onData: (rows: EntityData[]) => void,
  onError: (error: Error) => void,
  filter?: CollectionFilter,
): Unsubscribe {
  const constraints: QueryConstraint[] = [];
  if (filter) {
    constraints.push(where(filter.field, '==', filter.value));
  }
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => toEntity(d.id, d.data()));
      rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      onData(rows);
    },
    onError,
  );
}

/** Crea un documento. Devuelve el id generado. */
/** Lectura puntual de una colección (para reportes; no deja listener abierto). */
export async function fetchCollection(collectionName: string): Promise<EntityData[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((d) => toEntity(d.id, d.data()));
}

export async function createDocument(
  collectionName: string,
  data: Record<string, FieldValue | string[] | Record<string, unknown>>,
): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Crea o reemplaza un documento con id conocido (p. ej. perfil de usuario = uid). */
export async function setDocument(
  collectionName: string,
  id: string,
  data: Record<string, FieldValue | string[] | Record<string, unknown>>,
): Promise<void> {
  await setDoc(doc(db, collectionName, id), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

/** Actualiza campos de un documento existente. */
export async function updateDocument(
  collectionName: string,
  id: string,
  data: Record<string, FieldValue | string[] | Record<string, unknown>>,
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Elimina un documento. */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}