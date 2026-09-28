import type { PermissionAction, UserProfile } from '../types/models';

export type PermissionOverrides = NonNullable<UserProfile['permissionOverrides']>;

/**
 * Lee los ACCESOS EXTRA de un usuario venga como venga.
 *
 * Las listas (useCollection/toEntity) convierten los objetos anidados en
 * TEXTO JSON, así que `permissionOverrides` llega como string en la pantalla
 * de Users y en View as, y como objeto cuando se lee el documento directo
 * (login). Antes solo se aceptaba el objeto: el modal abría vacío tras
 * recargar y View as ignoraba los accesos extra ("No access").
 */
export function parsePermissionOverrides(raw: unknown): PermissionOverrides {
  let value: unknown = raw;
  if (typeof value === 'string') {
    if (value.trim() === '') return {};
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: PermissionOverrides = {};
  Object.entries(value as Record<string, unknown>).forEach(([moduleId, actions]) => {
    if (!actions || typeof actions !== 'object' || Array.isArray(actions)) return;
    const granted: Partial<Record<PermissionAction, boolean>> = {};
    Object.entries(actions as Record<string, unknown>).forEach(([action, on]) => {
      if (on === true) granted[action as PermissionAction] = true;
    });
    if (Object.keys(granted).length > 0) result[moduleId] = granted;
  });
  return result;
}

/** Cuántos permisos extra tiene concedidos. */
export function countPermissionOverrides(raw: unknown): number {
  return Object.values(parsePermissionOverrides(raw)).reduce(
    (total, actions) => total + Object.values(actions).filter(Boolean).length,
    0,
  );
}

/** Acciones que se pueden conceder como acceso extra (columnas del modal). */
export const OVERRIDABLE_ACTIONS: PermissionAction[] = [
  'ver',
  'crear',
  'editar',
  'eliminar',
  'exportar',
  'verHistorico',
];
