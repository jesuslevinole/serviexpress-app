import { useCallback, useMemo } from 'react';
import { CRUD_MODULES } from '../config/modules';
import { COLLECTIONS } from '../config/collections';
import { NO_CAPTURE_MODULE, useCaptureWindow } from './useCaptureWindow';
import type { EntityData, ModuleConfig } from '../types/models';

export type UnitStatusKind = 'shop' | 'corrective' | 'maintenanceStation';

export interface UnitStatusMark {
  kind: UnitStatusKind;
  title: string;
}

const NO_ROWS: EntityData[] = [];

/**
 * Estado operativo de cada camión para marcarlo en la tabla de Trucks:
 * orden de Shop abierta, mantenimiento correctivo pendiente (los mismos
 * bloqueos que usa Fleet Report) o Current station = "Maintenance".
 */
export function useUnitStatus(
  config: ModuleConfig,
  stationLabel: (id: string) => string,
) {
  const spec = config.unitStatus ?? null;
  const windowModule = useMemo(
    () => (spec ? (CRUD_MODULES.find((m) => m.id === spec.windowModuleId && m.captureWindow) ?? null) : null),
    [spec],
  );
  const info = useCaptureWindow(windowModule ?? NO_CAPTURE_MODULE, NO_ROWS);
  const target = spec?.maintenanceStationName.trim().toLowerCase() ?? '';

  const marksOf = useCallback(
    (row: EntityData): UnitStatusMark[] => {
      if (!spec) return [];
      const marks: UnitStatusMark[] = [];
      const sources = info.blockedSources.get(row.id);
      if (sources?.has(COLLECTIONS.shopOrders)) {
        marks.push({ kind: 'shop', title: 'In Shop — open order' });
      }
      if (sources?.has(COLLECTIONS.maintenance)) {
        marks.push({ kind: 'corrective', title: 'Corrective maintenance pending (not Done)' });
      }
      const station = row[spec.stationKey];
      if (
        typeof station === 'string' &&
        station !== '' &&
        stationLabel(station).trim().toLowerCase() === target
      ) {
        marks.push({ kind: 'maintenanceStation', title: 'Current station is Maintenance' });
      }
      return marks;
    },
    [spec, info.blockedSources, stationLabel, target],
  );

  return { enabled: spec !== null, columnKey: spec?.columnKey ?? '', marksOf };
}
