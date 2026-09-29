import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntityData } from '../types/models';
import { isActiveRecord } from '../services/activeStatus';

/** Camión que LLEGÓ a la estación del BC desde la última vez que revisó. */
export interface AssignedTruck {
  id: string;
  label: string;
}

/** Camión que SALIÓ de su estación, y dónde está hoy. */
export interface RemovedTruck {
  id: string;
  label: string;
  /** "moved to 771", "deactivated", "removed from Trucks". */
  reason: string;
}

interface SeenSnapshot {
  ids: string[];
  labels: Record<string, string>;
}

const PREFIX = 'sx_mytrucks_seen_';

function readSeen(key: string): SeenSnapshot | null {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SeenSnapshot>;
    if (!Array.isArray(parsed.ids)) return null;
    return {
      ids: parsed.ids.filter((id): id is string => typeof id === 'string'),
      labels: parsed.labels && typeof parsed.labels === 'object' ? parsed.labels : {},
    };
  } catch {
    return null;
  }
}

function writeSeen(key: string, snapshot: SeenSnapshot) {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(snapshot));
  } catch {
    /* sin almacenamiento: el aviso vuelve a salir en la siguiente carga */
  }
}

/**
 * Novedades de la estación del BC: qué camiones le ASIGNARON y cuáles le
 * QUITARON desde la última vez que abrió "My trucks". Compara la lista de
 * hoy (Current station, solo activos) con la foto guardada en este equipo.
 * La primera vez solo toma la foto (no hay nada que avisar). Cero lecturas
 * extra: usa el catálogo de camiones que el módulo ya tiene.
 */
export function useStationTruckChanges(params: {
  userId: string;
  stations: string[];
  /** Catálogo COMPLETO de camiones (incluye inactivos y de otras estaciones). */
  trucksAll: EntityData[];
  stationKey: string;
  activeKey: string;
  truckLabel: (id: string) => string;
  stationLabel: (id: string) => string;
}) {
  const { userId, stations, trucksAll, stationKey, activeKey, truckLabel, stationLabel } = params;
  const storageKey =
    userId !== '' && stations.length > 0 ? `${userId}_${[...stations].sort().join('-')}` : '';

  /** Camiones activos que HOY están en sus estaciones. */
  const currentIds = useMemo(() => {
    if (storageKey === '') return [] as string[];
    return trucksAll
      .filter((row) => {
        const st = row[stationKey];
        return typeof st === 'string' && stations.includes(st) && isActiveRecord(row, activeKey);
      })
      .map((row) => row.id);
  }, [storageKey, trucksAll, stations, stationKey, activeKey]);

  const [seen, setSeen] = useState<SeenSnapshot | null>(null);
  const loaded = trucksAll.length > 0;

  const snapshotNow = useCallback(
    (): SeenSnapshot => ({
      ids: currentIds,
      labels: Object.fromEntries(currentIds.map((id) => [id, truckLabel(id)])),
    }),
    [currentIds, truckLabel],
  );

  // Foto guardada; la primera vez se crea con lo actual (sin aviso).
  useEffect(() => {
    if (storageKey === '' || !loaded) {
      setSeen(null);
      return;
    }
    const stored = readSeen(storageKey);
    if (stored) {
      setSeen(stored);
      return;
    }
    const first = snapshotNow();
    writeSeen(storageKey, first);
    setSeen(first);
    // Solo al cambiar de usuario/estación o al llegar el catálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, loaded]);

  const byId = useMemo(() => new Map(trucksAll.map((row) => [row.id, row])), [trucksAll]);

  const assigned = useMemo<AssignedTruck[]>(() => {
    if (!seen) return [];
    const before = new Set(seen.ids);
    return currentIds
      .filter((id) => !before.has(id))
      .map((id) => ({ id, label: truckLabel(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [seen, currentIds, truckLabel]);

  const removed = useMemo<RemovedTruck[]>(() => {
    if (!seen) return [];
    const now = new Set(currentIds);
    return seen.ids
      .filter((id) => !now.has(id))
      .map((id) => {
        const truck = byId.get(id);
        let reason = 'removed from Trucks';
        if (truck) {
          const st = truck[stationKey];
          if (!isActiveRecord(truck, activeKey)) reason = 'deactivated';
          else if (typeof st === 'string' && st !== '') reason = `moved to ${stationLabel(st)}`;
          else reason = 'no station assigned now';
        }
        return { id, label: truck ? truckLabel(id) : (seen.labels[id] ?? id), reason };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [seen, currentIds, byId, stationKey, activeKey, truckLabel, stationLabel]);

  /** "Ya lo vi": la foto pasa a ser la lista de hoy y el botón se apaga. */
  const acknowledge = useCallback(() => {
    if (storageKey === '' || !loaded) return;
    const next = snapshotNow();
    writeSeen(storageKey, next);
    setSeen(next);
  }, [storageKey, loaded, snapshotNow]);

  return { assigned, removed, acknowledge };
}
