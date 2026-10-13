import { useEffect, useMemo, useState } from 'react';
import { subscribeCachedCollection, type QueryClause } from '../services/firestoreService';
import { STATION_KEY_BY_COLLECTION } from '../services/activeStatus';
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
/**
 * Catálogos referenciados que CRECEN sin límite (bcReports suma ~30 a la
 * semana): como referencia solo hacen falta los recientes para etiquetas.
 * El tope comparte el listener con el propio módulo (misma clave), así que
 * para el admin no cuesta lecturas extra.
 */
const REF_SUBSCRIBE_LIMITS: Record<string, number> = {
  bcReports: 500,
  maintenance: 500,
};

export function useRefMaps(
  fields: FieldConfig[],
  /**
   * Estaciones que acotan CADA catálogo, por colección: los camiones se
   * suscriben solo a las estaciones del usuario cuando su rol lo pide
   * (Visibility = Station), y así un teléfono de BC en carga fría no baja
   * 600+ documentos que no le tocan. Sin entrada, o lista vacía = catálogo
   * completo (admin, oficina o Visibility = All).
   */
  scopeByCollection: Record<string, string[]> = {},
): RefMaps {
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

  /** Estaciones efectivas por colección, ya normalizadas ("" = sin recorte). */
  const scopeKeys = useMemo(() => {
    const map: Record<string, string> = {};
    collections.forEach((name) => {
      const stations = scopeByCollection[name] ?? [];
      map[name] = stations.length > 0 && stations.length <= 30 ? stations.join(',') : '';
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scopeSignature representa el mapa
  }, [collections, JSON.stringify(scopeByCollection)]);
  const collectionsKey = `${collections.join('|')}#${collections
    .map((name) => scopeKeys[name] ?? '')
    .join('|')}`;
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

    const unsubscribers = collections.map((collectionName) => {
      const stationKey = STATION_KEY_BY_COLLECTION[collectionName];
      const stationsKey = scopeKeys[collectionName] ?? '';
      const clauses: QueryClause[] | undefined =
        stationKey !== undefined && stationsKey !== ''
          ? [{ op: 'in', field: stationKey, values: stationsKey.split(',') }]
          : undefined;
      // Tope solo SIN cláusulas (limit exige orderBy y con "in" pediría un
      // índice compuesto); con alcance el conjunto ya es chico.
      const limit = clauses === undefined ? REF_SUBSCRIBE_LIMITS[collectionName] : undefined;
      return subscribeCachedCollection(
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
        undefined,
        // Catálogos: 30 min de vigencia (las escrituras invalidan al instante).
        { clauses, limit, ttlMs: 30 * 60 * 1000 },
      );
    });
    return () => unsubscribers.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionsKey]);

  return maps;
}