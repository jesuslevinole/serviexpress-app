import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  orderBy,
  limit as limitTo,
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

/** Opciones de lectura de una colección. */
export interface CollectionOptions {
  /**
   * Máximo de documentos a traer, de los más recientes hacia atrás. Sin esto
   * se lee la colección COMPLETA en cada carga, que es lo que dispara el
   * consumo: un módulo con 4.500 registros cuesta 4.500 lecturas por visita.
   */
  limit?: number;
}

export interface CollectionFilter {
  field: string;
  value: FieldValue;
}

/** Suscripción en tiempo real a una colección, con filtro opcional. */
/**
 * Registro de suscripciones compartidas. Varios componentes que piden la
 * misma consulta reutilizan UN solo listener, y al desmontarse todos se
 * conserva unos segundos (y con sus datos en memoria) para que navegar de
 * ida y vuelta no vuelva a leer de Firestore.
 */
interface SharedSubscription {
  rows: EntityData[] | null;
  listeners: Set<(rows: EntityData[]) => void>;
  errorListeners: Set<(error: Error) => void>;
  unsubscribe: Unsubscribe | null;
  closeTimer: number | null;
}

const shared = new Map<string, SharedSubscription>();

/** Segundos que un listener sigue vivo sin componentes escuchándolo. */
const KEEP_ALIVE_MS = 5 * 60 * 1000;

function subscriptionKey(collectionName: string, filter?: CollectionFilter): string {
  return filter ? `${collectionName}|${filter.field}|${String(filter.value)}` : collectionName;
}

export function subscribeToCollection(
  collectionName: string,
  onData: (rows: EntityData[]) => void,
  onError: (error: Error) => void,
  filter?: CollectionFilter,
  options?: CollectionOptions,
): Unsubscribe {
  const key = `${subscriptionKey(collectionName, filter)}|${options?.limit ?? 'all'}`;
  let entry = shared.get(key);

  if (!entry) {
    entry = {
      rows: null,
      listeners: new Set(),
      errorListeners: new Set(),
      unsubscribe: null,
      closeTimer: null,
    };
    shared.set(key, entry);
  }

  const current = entry;
  current.listeners.add(onData);
  current.errorListeners.add(onError);

  // Cancelar el cierre programado: alguien volvió a necesitar estos datos.
  if (current.closeTimer !== null) {
    window.clearTimeout(current.closeTimer);
    current.closeTimer = null;
  }

  // Datos ya en memoria: se entregan de inmediato, sin leer nada.
  if (current.rows) onData(current.rows);

  if (!current.unsubscribe) {
    const constraints: QueryConstraint[] = [];
    if (filter) {
      constraints.push(where(filter.field, '==', filter.value));
    }
    if (options?.limit) {
      // Más recientes primero y solo los N necesarios. Los documentos sin
      // createdAt (migraciones antiguas) quedarían fuera de este orden, por
      // eso el tope solo se aplica donde el módulo lo pide expresamente.
      constraints.push(orderBy('createdAt', 'desc'), limitTo(options.limit));
    }
    const q = query(collection(db, collectionName), ...constraints);
    current.unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => toEntity(d.id, d.data()));
        rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
        current.rows = rows;
        current.listeners.forEach((listener) => listener(rows));
      },
      (error) => current.errorListeners.forEach((listener) => listener(error)),
    );
  }

  return () => {
    current.listeners.delete(onData);
    current.errorListeners.delete(onError);
    if (current.listeners.size > 0 || current.closeTimer !== null) return;
    // Sin oyentes: se cierra tras un rato, conservando los datos mientras tanto.
    current.closeTimer = window.setTimeout(() => {
      current.unsubscribe?.();
      shared.delete(key);
    }, KEEP_ALIVE_MS);
  };
}

/** Conteo de documentos sin traerlos: 1 lectura en vez de N. */
export async function countDocuments(
  collectionName: string,
  filter?: CollectionFilter,
): Promise<number> {
  const constraints: QueryConstraint[] = [];
  if (filter) {
    constraints.push(where(filter.field, '==', filter.value));
  }
  const snapshot = await getCountFromServer(
    query(collection(db, collectionName), ...constraints),
  );
  return snapshot.data().count;
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
  /** true = conserva los campos que no vienen en `data` (actualización parcial). */
  merge = false,
): Promise<void> {
  const payload = merge
    ? { ...data, updatedAt: serverTimestamp() }
    : { ...data, createdAt: new Date().toISOString(), updatedAt: serverTimestamp() };
  await setDoc(doc(db, collectionName, id), payload, { merge });
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