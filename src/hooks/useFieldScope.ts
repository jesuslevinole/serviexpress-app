import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useUiConfig } from './useUiConfig';
import type { FieldViewScope } from '../context/uiConfigContext';

export interface FieldScope {
  /**
   * Alcance configurado para ESTE campo y el rol del usuario actual, o
   * undefined si no hay regla propia (entonces manda la Visibility del
   * módulo en Roles, como siempre).
   */
  scopeOf: (moduleId: string, fieldKey: string) => FieldViewScope | undefined;
  /** ¿El rol tiene prohibido ver este campo? (alcance "none"). */
  isHidden: (moduleId: string, fieldKey: string) => boolean;
}

/**
 * Alcance POR CAMPO, configurado en "Edit layout" de cada módulo. Permite
 * decir cosas como: este rol ve el módulo solo con SUS registros, pero en el
 * campo Truck ve los camiones de SU ESTACIÓN.
 *
 * El admin real (sin "View as") nunca pierde un campo: si no, una regla mal
 * puesta se volvería imposible de corregir desde el propio configurador.
 */
export function useFieldScope(): FieldScope {
  const { overrides } = useUiConfig();
  const { effectiveRole, isAdminView } = useAuth();
  const roleId = effectiveRole?.id ?? '';

  const scopeOf = useCallback(
    (moduleId: string, fieldKey: string): FieldViewScope | undefined => {
      const override = overrides.modules[moduleId]?.fields?.[fieldKey];
      if (!override) return undefined;
      return override.viewScopeByRole?.[roleId] ?? override.viewScope;
    },
    [overrides, roleId],
  );

  const isHidden = useCallback(
    (moduleId: string, fieldKey: string): boolean =>
      !isAdminView && scopeOf(moduleId, fieldKey) === 'none',
    [scopeOf, isAdminView],
  );

  return { scopeOf, isHidden };
}
