import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { CRUD_MODULES, MODULE_BY_COLLECTION } from '../config/modules';
import type { ViewScope } from '../types/models';

/**
 * ¿A qué estaciones queda limitado el usuario EN ESTE MÓDULO?
 *
 * Manda UNA sola cosa: la columna Visibility del rol (Roles). Solo
 * "Station" y "Entity + Station" recortan; con "All" u "Own" no se recorta
 * nada, ni la lista del módulo ni sus desplegables.
 *
 * Antes cada capa decidía por su cuenta: la lista respetaba el rol pero los
 * catálogos (camiones, BC Reports) se recortaban a las estaciones asignadas
 * aunque el rol dijera "All" — por eso a un BC con Visibility = All le salía
 * "No results" al buscar un camión de otra estación.
 *
 * Devuelve [] = sin recorte (admin real, oficina, alcance All/Own, o usuario
 * sin estaciones asignadas: una configuración incompleta no debe esconderlo
 * todo).
 */
export interface StationScope {
  /** Estaciones que acotan ESTE módulo (vacío = ninguna limitación). */
  forModule: (moduleId: string | undefined) => string[];
  /** Igual, pero a partir de la colección del catálogo (p. ej. trucks). */
  forCollection: (collection: string) => string[];
  /** Alcance que el rol declara para el módulo. */
  scopeOf: (moduleId: string | undefined) => ViewScope;
  /** Usuario sin ninguna limitación (admin real u oficina). */
  unrestricted: boolean;
}

export function useStationScope(): StationScope {
  const { profile, viewAs, isAdmin, effectiveRole } = useAuth();

  const effectiveUser = viewAs ?? profile;
  const unrestricted = (isAdmin && viewAs === null) || effectiveUser?.isOffice === true;
  const stations = useMemo(() => effectiveUser?.scopeStations ?? [], [effectiveUser]);
  const permissions = useMemo(() => effectiveRole?.permissions ?? {}, [effectiveRole]);

  const scopeOf = useCallback(
    (moduleId: string | undefined): ViewScope => {
      if (unrestricted || moduleId === undefined) return 'all';
      return permissions[moduleId]?.alcance ?? 'all';
    },
    [unrestricted, permissions],
  );

  const forModule = useCallback(
    (moduleId: string | undefined): string[] => {
      const alcance = scopeOf(moduleId);
      if (alcance === 'all') return [];
      // Trucks: cualquier restricción del rol se reduce a "misma Current
      // station" (stationOnlyScope), igual que en la lista del módulo.
      const stationOnly =
        CRUD_MODULES.find((m) => m.id === moduleId)?.stationOnlyScope === true;
      if (!stationOnly && alcance !== 'station' && alcance !== 'entity_station') return [];
      return stations;
    },
    [scopeOf, stations],
  );

  const forCollection = useCallback(
    (collection: string): string[] => forModule(MODULE_BY_COLLECTION[collection]),
    [forModule],
  );

  return { forModule, forCollection, scopeOf, unrestricted };
}
