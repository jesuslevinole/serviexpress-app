import { useEffect, useState } from 'react';
import { subscribeToCollection, type CollectionFilter } from '../services/firestoreService';
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
): UseCollectionResult {
  const [rows, setRows] = useState<EntityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterField = filter?.field ?? null;
  const filterValue = filter?.value ?? null;

  useEffect(() => {
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
    );
    return unsubscribe;
  }, [collectionName, filterField, filterValue]);

  return { rows, loading, error };
}
