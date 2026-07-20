import { useEffect, useMemo, useState } from 'react';
import { subscribeToCollection } from '../services/firestoreService';
import { buildRefLabel } from '../config/collections';
import type { EntityData, FieldConfig } from '../types/models';

export interface RefData {
  /** id -> etiqueta visible (nombre, nunca id). */
  labels: Map<string, string>;
  /** Registros completos (para filtrar opciones, p. ej. assets tipo SCANNER). */
  rows: EntityData[];
}

export type RefMaps = Record<string, RefData>;

/**
 * Se suscribe una sola vez a cada colección referenciada por los campos
 * de un módulo y devuelve mapas id -> nombre para mostrar y para los selects.
 */
export function useRefMaps(fields: FieldConfig[]): RefMaps {
  const collections = useMemo(() => {
    const set = new Set<string>();
    fields.forEach((f) => {
      if (f.type === 'ref' && f.refCollection) set.add(f.refCollection);
    });
    return Array.from(set).sort();
  }, [fields]);

  const collectionsKey = collections.join('|');
  const [maps, setMaps] = useState<RefMaps>({});

  useEffect(() => {
    if (collections.length === 0) {
      setMaps({});
      return;
    }
    const unsubscribers = collections.map((collectionName) =>
      subscribeToCollection(
        collectionName,
        (rows) => {
          const labels = new Map<string, string>();
          rows.forEach((row) => labels.set(row.id, buildRefLabel(collectionName, row)));
          setMaps((prev) => ({ ...prev, [collectionName]: { labels, rows } }));
        },
        () => {
          setMaps((prev) => ({ ...prev, [collectionName]: { labels: new Map(), rows: [] } }));
        },
      ),
    );
    return () => unsubscribers.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionsKey]);

  return maps;
}
