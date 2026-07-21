/**
 * Valores de los enums del sistema.
 * Ajusta aquí las listas y todos los formularios, tablas y reportes
 * se actualizan solos (los valores viven en un solo lugar).
 */

export const TRUCK_TYPES = ['P1000', 'P1200', 'CTV', 'STRAIGHT TRUCK', 'TRACTOR', 'VAN'] as const;

export const TRUCK_STATUS = ['ACTIVO', 'INACTIVO', 'TALLER', 'BAJA'] as const;

export const DRIVER_STATUS = ['ACTIVO', 'INACTIVO', 'BAJA'] as const;

export const DOC_STATUS = ['VIGENTE', 'VENCIDO', 'EN TRAMITE'] as const;

export const ASSET_TYPES = ['SCANNER', 'TELEFONO', 'TABLETA', 'GAS CARD', 'IMPRESORA', 'OTRO'] as const;

export const ASSET_STATUS = ['DISPONIBLE', 'ASIGNADO', 'DANADO', 'BAJA'] as const;

export const SHOP_STATUS = ['ABIERTA', 'EN PROCESO', 'CERRADA', 'GARANTIA'] as const;

export const CHECK_VALUES = ['OK', 'MAL', 'N/A'] as const;

export const BC_STATUS = ['PENDIENTE', 'COMPLETADO'] as const;

export const REQUIREMENT_STATUS = ['PENDIENTE', 'APROBADO', 'ENTREGADO', 'RECHAZADO'] as const;

export const UNIFORM_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;

export const USER_STATUS = ['ACTIVO', 'INACTIVO'] as const;

/** Estados que se pintan en verde en las tablas. */
export const POSITIVE_STATUS: readonly string[] = [
  'YES',
  'SÍ',
  'SI',
  'ACTIVO',
  'ACTIVE',
  'VIGENTE',
  'DISPONIBLE',
  'OK',
  'COMPLETADO',
  'ENTREGADO',
  'APROBADO',
  'CERRADA',
];

/** Estados que se pintan en rojo. */
export const NEGATIVE_STATUS: readonly string[] = [
  'BAD',
  'NO',
  'NO ACTIVE',
  'INACTIVO',
  'INACTIVE',
  'VENCIDO',
  'BAJA',
  'MAL',
  'DANADO',
  'RECHAZADO',
];
