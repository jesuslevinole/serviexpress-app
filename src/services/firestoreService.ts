import {
  deleteField,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
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
  /**
   * Condiciones adicionales que se resuelven en el servidor (así solo viajan
   * los documentos que interesan): "campo dentro de una lista" o "campo en
   * un rango". Un rango solo puede ir sobre un campo por consulta.
   */
  clauses?: QueryClause[];
}

/** Condición de consulta que Firestore evalúa del lado del servidor. */
export type QueryClause =
  | { field: string; op: 'in'; values: FieldValue[] }
  | { field: string; op: 'range'; from: string; to: string };

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
  const clausesKey = options?.clauses ? JSON.stringify(options.clauses) : '';
  const key = `${subscriptionKey(collectionName, filter)}|${options?.limit ?? 'all'}${clausesKey}`;
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
    (options?.clauses ?? []).forEach((clause) => {
      if (clause.op === 'in') {
        // Firestore admite hasta 30 valores por "in"; las listas de estatus
        // abiertos son mucho más cortas.
        constraints.push(where(clause.field, 'in', clause.values));
      } else {
        constraints.push(where(clause.field, '>=', clause.from), where(clause.field, '<=', clause.to));
      }
    });
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
        // Solo los cambios que vienen del servidor cuestan lecturas.
        let fresh = 0;
        snapshot.docChanges().forEach((change) => {
          if (!change.doc.metadata.fromCache) fresh += 1;
        });
        trackReads(collectionName, fresh);
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

/* ── Monitor de lecturas de la sesión ─────────────────────────────────
 * Cuenta los documentos ENTREGADOS POR EL SERVIDOR (los que Firestore
 * factura; los servidos por el caché local no cuestan). Sirve para ver en
 * vivo qué colección está gastando las lecturas del plan. */
const readTally = new Map<string, number>();

function trackReads(source: string, count: number) {
  if (count <= 0) return;
  readTally.set(source, (readTally.get(source) ?? 0) + count);
}

export function getReadTally(): { total: number; entries: { source: string; reads: number }[] } {
  const entries = [...readTally.entries()]
    .map(([source, reads]) => ({ source, reads }))
    .sort((a, b) => b.reads - a.reads);
  return { total: entries.reduce((acc, e) => acc + e.reads, 0), entries };
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
  trackReads(`${collectionName} (aggregate)`, 1);
  return snapshot.data().count;
}

/** Crea un documento. Devuelve el id generado. */
/** Lectura puntual de una colección (para reportes; no deja listener abierto). */
export async function fetchCollection(collectionName: string): Promise<EntityData[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  if (!snapshot.metadata.fromCache) trackReads(`${collectionName} (fetch)`, snapshot.size);
  return snapshot.docs.map((d) => toEntity(d.id, d.data()));
}

/**
 * Conteo con respaldo: primero la consulta de agregación (1 lectura); si el
 * navegador o el entorno la rechazan, se cuenta trayendo los documentos con
 * la MISMA consulta filtrada que usa la subtabla (que sí funciona en todos
 * lados). Cuesta más lecturas, pero solo se usa como plan B y una sola vez
 * por registro. Si ambas fallan, se propaga el error original.
 */
export async function countDocumentsSafe(
  collectionName: string,
  filter: CollectionFilter,
): Promise<number> {
  try {
    return await countDocuments(collectionName, filter);
  } catch (error) {
    try {
      const snapshot = await getDocs(
        query(collection(db, collectionName), where(filter.field, '==', filter.value)),
      );
      if (!snapshot.metadata.fromCache) trackReads(`${collectionName} (count fallback)`, snapshot.size);
      return snapshot.size;
    } catch {
      throw error;
    }
  }
}

/**
 * Cuántos documentos de la colección TIENEN dato en un campo (ordenar por el
 * campo solo devuelve los que lo tienen). 1 lectura. Para avisar antes de
 * eliminar un campo personalizado.
 */
export async function countDocumentsHavingField(
  collectionName: string,
  fieldKey: string,
): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(db, collectionName), orderBy(fieldKey)),
  );
  trackReads(`${collectionName} (aggregate)`, 1);
  return snapshot.data().count;
}

/**
 * Elimina un campo de TODOS los documentos que lo tienen (borrado físico del
 * dato, con confirmación previa del admin). Devuelve cuántos se limpiaron.
 */
export async function removeFieldFromDocuments(
  collectionName: string,
  fieldKey: string,
): Promise<number> {
  const snapshot = await getDocs(query(collection(db, collectionName), orderBy(fieldKey)));
  if (!snapshot.metadata.fromCache) trackReads(`${collectionName} (fetch)`, snapshot.size);
  for (const document of snapshot.docs) {
    await updateDoc(doc(db, collectionName, document.id), { [fieldKey]: deleteField() });
  }
  return snapshot.size;
}

/** Lectura puntual de una colección FILTRADA (para reapuntar referencias). */
export async function fetchDocumentsWhere(
  collectionName: string,
  filter: CollectionFilter,
): Promise<EntityData[]> {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where(filter.field, '==', filter.value)),
  );
  if (!snapshot.metadata.fromCache) trackReads(`${collectionName} (fetch)`, snapshot.size);
  return snapshot.docs.map((d) => toEntity(d.id, d.data()));
}

/** Lectura puntual de UN documento (null si no existe). */
export async function fetchDocument(collectionName: string, id: string): Promise<EntityData | null> {
  const snapshot = await getDoc(doc(db, collectionName, id));
  if (!snapshot.exists()) return null;
  return toEntity(snapshot.id, snapshot.data());
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

/**
 * Suma (o resta) 1 a un contador del documento de forma atómica: aunque dos
 * personas capturen renglones a la vez, el total no se pisa. Se usa para el
 * número de renglones de cada BC Report ("cuáles están vacíos") sin tener
 * que leer la colección de renglones completa.
 */
export async function adjustCounter(
  collectionName: string,
  id: string,
  field: string,
  delta: number,
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), {
    [field]: increment(delta),
    updatedAt: serverTimestamp(),
  });
}