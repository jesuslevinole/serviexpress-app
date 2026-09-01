import { createContext } from 'react';
import type { FormStep, ModuleConfig } from '../types/models';

export interface FieldOverride {
  label?: string;
  order?: number;
  /** Obligatorio configurado por el admin (sobrescribe el del código). */
  required?: boolean;
  /** false = la columna no se muestra en la tabla (semántica anterior). */
  table?: boolean;
  /** true = el campo NO se ve en ningún lado, para NADIE (ni el admin). */
  hidden?: boolean;
  /** true = solo los administradores ven el campo (tabla y formulario). */
  adminOnly?: boolean;
}

/** Campo agregado por el admin desde "Edit layout" (vive en los documentos). */
export interface CustomFieldDef {
  /** Clave física en el documento ("cf_placa"). */
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'bool';
}

export interface ModuleOverride {
  title?: string;
  order?: number;
  fields?: Record<string, FieldOverride>;
  /** Campos agregados por el admin: se capturan y guardan en la colección. */
  customFields?: CustomFieldDef[];
  /** Pestañas del formulario configuradas por el admin (sustituyen a las del código). */
  formSteps?: FormStep[];
}

export interface UiOverrides {
  modules: Record<string, ModuleOverride>;
}

export interface UiConfigContextValue {
  overrides: UiOverrides;
  /** Admin edit mode: enables renaming and reordering across the app. */
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  /** Applies title/label/order overrides to a module config. */
  applyToModule: (base: ModuleConfig) => ModuleConfig;
  /** Effective title of a module (override or base). */
  moduleTitle: (moduleId: string, baseTitle: string) => string;
  /** Sorts module ids by their configured menu order. */
  sortModules: <T extends { id: string }>(modules: T[]) => T[];
  /** Persists overrides for one module (merged into the document). */
  saveModuleOverride: (moduleId: string, override: ModuleOverride) => Promise<void>;
  /** Persists the menu order for the given ids (position = order). */
  saveMenuOrder: (idsInOrder: string[]) => Promise<void>;
  /** Mensaje cuando la configuración compartida no se pudo leer o guardar. */
  saveError: string | null;
}

export const UiConfigContext = createContext<UiConfigContextValue | null>(null);