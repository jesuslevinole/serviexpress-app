import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { COLLECTIONS } from '../config/collections';
import type { EntityData, ModuleConfig, ViewScope } from '../types/models';

/**
 * Visibilidad de registros por módulo, definida en el ROL (matriz de Roles):
 * - all: ve todos los registros del módulo.
 * - own: solo los registros capturados por el propio usuario.
 * - station: los registros cuya estación coincide con alguna de sus estaciones asignadas.
 * - entity_station: deben coincidir su estación Y su entidad asignadas.
 * El admin real ve todo; "View as" simula el rol y el alcance del usuario elegido.
 * Usuarios "Office" ven todo. Si el rol pide filtrar por asignaciones y el usuario
 * no tiene ninguna, no se le restringe (falta de configuración no debe ocultar todo).
 */
export function useScopeFilter(): (config: ModuleConfig, row: EntityData) => boolean {
  const { profile, viewAs, isAdmin, effectiveRole } = useAuth();

  const effectiveUser = viewAs ?? profile;
  const scopeEntities = useMemo(() => effectiveUser?.scopeEntities ?? [], [effectiveUser]);
  const scopeStations = useMemo(() => effectiveUser?.scopeStations ?? [], [effectiveUser]);
  const isOffice = effectiveUser?.isOffice === true;
  const adminUnrestricted = isAdmin && viewAs === null;
  const userId = effectiveUser?.id ?? '';
  const permissions = useMemo(() => effectiveRole?.permissions ?? {}, [effectiveRole]);

  return useCallback(
    (config: ModuleConfig, row: EntityData): boolean => {
      if (adminUnrestricted || isOffice) return true;
      const alcance: ViewScope = permissions[config.id]?.alcance ?? 'all';
      if (alcance === 'all') return true;

      if (alcance === 'own') {
        const key = config.autoUserField;
        if (!key) return true;
        return row[key] === userId;
      }

      // Si el módulo marca cuál campo manda (scopeKey), solo ese decide; si
      // no, valen todos los que apunten al catálogo, como antes.
      const pick = (kind: 'station' | 'entity', collection: string) => {
        const marked = config.fields.filter((f) => f.scopeKey === kind);
        if (marked.length > 0) return marked;
        return config.fields.filter((f) => f.type === 'ref' && f.refCollection === collection);
      };
      const stationFields = pick('station', COLLECTIONS.stations);
      const entityFields = pick('entity', COLLECTIONS.entities);

      const matchesStation =
        scopeStations.length === 0 ||
        stationFields.length === 0 ||
        stationFields.some((f) => {
          const value = row[f.key];
          return typeof value === 'string' && scopeStations.includes(value);
        });

      if (alcance === 'station') return matchesStation;

      // entity_station: deben coincidir ambas dimensiones
      const matchesEntity =
        scopeEntities.length === 0 ||
        entityFields.length === 0 ||
        entityFields.some((f) => {
          const value = row[f.key];
          return typeof value === 'string' && scopeEntities.includes(value);
        });
      return matchesStation && matchesEntity;
    },
    [adminUnrestricted, isOffice, permissions, userId, scopeEntities, scopeStations],
  );
}