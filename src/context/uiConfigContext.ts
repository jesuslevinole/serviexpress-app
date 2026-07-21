import { createContext } from 'react';
import type { ModuleConfig } from '../types/models';

export interface FieldOverride {
  label?: string;
  order?: number;
}

export interface ModuleOverride {
  title?: string;
  order?: number;
  fields?: Record<string, FieldOverride>;
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
}

export const UiConfigContext = createContext<UiConfigContextValue | null>(null);
