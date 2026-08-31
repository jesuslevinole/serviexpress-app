import { useEffect, useState } from 'react';
import {
  subscribeToCollection,
  type CollectionFilter,
  type QueryClause,
} from '../services/firestoreService';
import type { EntityData } from '../types/models';

interface UseCollectionResult {
  rows: EntityData[];
  loading: boolean;
  error: string | null;
}

/** Suscripción tipada en tiempo real a una colección de Firestore. */
export function useCollection(
  collectionName: string,
  filter?: CollectionFilter,
  /** Tope de documentos (los más recientes). Sin él se lee todo. */
  limit?: number,
  /** Cláusulas extra por servidor (alcance por estaciones, rangos). */
  clauses?: QueryClause[],
): UseCollectionResult {
  const [rows, setRows] = useState<EntityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterField = filter?.field ?? null;
  const filterValue = filter?.value ?? null;

  useEffect(() => {
    // Nombre vacío: el módulo no tiene esa colección (p. ej. sin detalle).
    if (collectionName === '') {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const activeFilter =
      filterField !== null ? { field: filterField, value: filterValue } : undefined;
    const unsubscribe = subscribeToCollection(
      collectionName,
      (data) => {
        setRows(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      activeFilter,
      limit !== undefined || clauses !== undefined ? { limit, clauses } : undefined,
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clausesKey representa a clauses
  }, [collectionName, filterField, filterValue, limit, JSON.stringify(clauses ?? null)]);

  return { rows, loading, error };
}