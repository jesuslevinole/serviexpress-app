import { useEffect, useMemo, useState } from 'react';
import { subscribeToCollection } from '../services/firestoreService';
import { REF_LABEL_DEPENDENCIES, buildRefLabel } from '../config/collections';
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
    // Colecciones auxiliares necesarias para armar etiquetas (driver -> team).
    Array.from(set).forEach((name) => {
      (REF_LABEL_DEPENDENCIES[name] ?? []).forEach((dep) => set.add(dep));
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
    /** Filas vivas de cada colección, para resolver etiquetas compuestas. */
    const rowsByCollection = new Map<string, EntityData[]>();
    const resolve = (collectionName: string, id: string): string | undefined => {
      const row = rowsByCollection.get(collectionName)?.find((r) => r.id === id);
      if (!row) return undefined;
      const name = row.name;
      return typeof name === 'string' && name !== '' ? name : undefined;
    };

    const unsubscribers = collections.map((collectionName) =>
      subscribeToCollection(
        collectionName,
        (rows) => {
          rowsByCollection.set(collectionName, rows);
          const labels = new Map<string, string>();
          rows.forEach((row) => labels.set(row.id, buildRefLabel(collectionName, row, resolve)));
          setMaps((prev) => ({ ...prev, [collectionName]: { labels, rows } }));
          // Al llegar una colección auxiliar, se recalculan las que dependen de ella.
          Object.entries(REF_LABEL_DEPENDENCIES).forEach(([target, deps]) => {
            if (!deps.includes(collectionName)) return;
            const targetRows = rowsByCollection.get(target);
            if (!targetRows) return;
            const targetLabels = new Map<string, string>();
            targetRows.forEach((row) =>
              targetLabels.set(row.id, buildRefLabel(target, row, resolve)),
            );
            setMaps((prev) => ({ ...prev, [target]: { labels: targetLabels, rows: targetRows } }));
          });
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