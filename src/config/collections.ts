import type { EntityData } from '../types/models';

/** Nombres de las colecciones de Firestore (un solo lugar, sin strings sueltos). */
export const COLLECTIONS = {
  users: 'users',
  roles: 'roles',
  entities: 'entities',
  stations: 'stations',
  driverCategories: 'driverCategories',
  shopNames: 'shopNames',
  vendors: 'vendors',
  requestTypes: 'requestTypes',
  uniformItems: 'uniformItems',
  routes: 'routes',
  team: 'team',
  sizes: 'sizes',
  uniformEntries: 'uniformEntries',
  trucks: 'trucks',
  drivers: 'drivers',
  assets: 'assets',
  fleet: 'fleet',
  shopOrders: 'shopOrders',
  bcReports: 'bcReports',
  bcReportDetails: 'bcReportDetails',
  rentals: 'rentals',
  maintenance: 'maintenance',
  accidents: 'accidents',
  accidentPhotos: 'accidentPhotos',
  incidentTypes: 'incidentTypes',
  truckHistory: 'truck_history',
  requirements: 'requirements',
  uniforms: 'uniforms',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * Cómo se construye la etiqueta visible de cada registro referenciado.
 * Regla del proyecto: nunca se muestran IDs, siempre nombres.
 */
/**
 * Colecciones que necesitan OTRA colección para armar su etiqueta.
 * (Un driver toma su nombre del catálogo Team.)
 */
export const REF_LABEL_DEPENDENCIES: Record<string, string[]> = {
  /**
   * V00045: la dependencia de Team se QUITÓ a propósito. El catálogo Team
   * (430 docs) viajaba completo a los 5 módulos que muestran drivers solo
   * para armar el nombre — pero los drivers ya traen su nombre copiado
   * ("APELLIDOS, Nombres"), así que la etiqueta sale del propio driver. En
   * el módulo Drivers, Team sigue suscrito (campo idTeam) y ahí la
   * resolución completa sigue funcionando. Ahorro: -430 lecturas por carga
   * fría en Trucks, Fleet, Assets, Accidents y Requirements.
   */
};

/** resolve(colección, id) -> nombre, disponible para etiquetas compuestas. */
export type RefResolver = (collection: string, id: string) => string | undefined;

export const REF_LABEL_BUILDERS: Record<
  string,
  (d: EntityData, resolve?: RefResolver) => string
> = {
  [COLLECTIONS.drivers]: (d, resolve) => {
    // El nombre vive en Team; en registros migrados el id quedó en "name".
    const link = [d.idTeam, d.name].find((v) => typeof v === 'string' && v !== '');
    if (typeof link === 'string') {
      const fromTeam = resolve?.(COLLECTIONS.team, link);
      if (fromTeam && fromTeam !== '') return fromTeam;
    }
    return typeof d.name === 'string' && d.name !== '' ? d.name : '(sin nombre)';
  },
  [COLLECTIONS.trucks]: (d) =>
    [d.unitN, d.lPlate].filter((v) => typeof v === 'string' && v !== '').join(' · ') || 'Camión',
  [COLLECTIONS.bcReports]: (d) => {
    const date = typeof d.date === 'string' && d.date !== '' ? d.date : 'BC Report';
    return `BC ${date}`;
  },
  [COLLECTIONS.assets]: (d) =>
    [d.type, d.mark, d.serialNumber]
      .filter((v) => typeof v === 'string' && v !== '')
      .join(' · ') || 'Asset',
};

export function buildRefLabel(
  collection: string,
  data: EntityData,
  resolve?: RefResolver,
): string {
  const builder = REF_LABEL_BUILDERS[collection];
  if (builder) return builder(data, resolve);
  const name = data.name;
  return typeof name === 'string' && name !== '' ? name : '(sin nombre)';
}