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
  trucks: 'trucks',
  drivers: 'drivers',
  assets: 'assets',
  fleet: 'fleet',
  shopOrders: 'shopOrders',
  bcReports: 'bcReports',
  bcReportDetails: 'bcReportDetails',
  rentals: 'rentals',
  requirements: 'requirements',
  uniforms: 'uniforms',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * Cómo se construye la etiqueta visible de cada registro referenciado.
 * Regla del proyecto: nunca se muestran IDs, siempre nombres.
 */
export const REF_LABEL_BUILDERS: Record<string, (d: EntityData) => string> = {
  [COLLECTIONS.trucks]: (d) =>
    [d.unitN, d.lPlate].filter((v) => typeof v === 'string' && v !== '').join(' · ') || 'Camión',
  [COLLECTIONS.assets]: (d) =>
    [d.type, d.mark, d.serialNumber]
      .filter((v) => typeof v === 'string' && v !== '')
      .join(' · ') || 'Asset',
};

export function buildRefLabel(collection: string, data: EntityData): string {
  const builder = REF_LABEL_BUILDERS[collection];
  if (builder) return builder(data);
  const name = data.name;
  return typeof name === 'string' && name !== '' ? name : '(sin nombre)';
}
