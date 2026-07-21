import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  UiConfigContext,
  type ModuleOverride,
  type UiOverrides,
} from './uiConfigContext';
import type { ModuleConfig } from '../types/models';

const OVERRIDES_DOC = { collection: 'settings_ui', id: 'overrides' } as const;

const EMPTY: UiOverrides = { modules: {} };

/**
 * Loads and persists the admin UI customization (renamed titles, headers
 * and ordering) from Firestore, and exposes helpers to apply it.
 */
export function UiConfigProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<UiOverrides>(EMPTY);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const ref = doc(db, OVERRIDES_DOC.collection, OVERRIDES_DOC.id);
    return onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setOverrides(EMPTY);
          return;
        }
        const data = snapshot.data();
        const modules =
          typeof data.modules === 'object' && data.modules !== null
            ? (data.modules as UiOverrides['modules'])
            : {};
        setOverrides({ modules });
      },
      () => setOverrides(EMPTY),
    );
  }, []);

  const persist = useCallback(async (next: UiOverrides) => {
    await setDoc(doc(db, OVERRIDES_DOC.collection, OVERRIDES_DOC.id), next);
  }, []);

  const saveModuleOverride = useCallback(
    async (moduleId: string, override: ModuleOverride) => {
      const current = overrides.modules[moduleId] ?? {};
      const next: UiOverrides = {
        modules: { ...overrides.modules, [moduleId]: { ...current, ...override } },
      };
      setOverrides(next);
      await persist(next);
    },
    [overrides, persist],
  );

  const saveMenuOrder = useCallback(
    async (idsInOrder: string[]) => {
      const modules = { ...overrides.modules };
      idsInOrder.forEach((id, index) => {
        modules[id] = { ...(modules[id] ?? {}), order: index };
      });
      const next: UiOverrides = { modules };
      setOverrides(next);
      await persist(next);
    },
    [overrides, persist],
  );

  const applyToModule = useCallback(
    (base: ModuleConfig): ModuleConfig => {
      const moduleOverride = overrides.modules[base.id];
      if (!moduleOverride) return base;
      const fieldOverrides = moduleOverride.fields ?? {};
      const fields = base.fields
        .map((field, index) => ({
          field: fieldOverrides[field.key]?.label
            ? { ...field, label: fieldOverrides[field.key]!.label! }
            : field,
          order: fieldOverrides[field.key]?.order ?? index,
        }))
        .sort((a, b) => a.order - b.order)
        .map((item) => item.field);
      return {
        ...base,
        title: moduleOverride.title ?? base.title,
        fields,
      };
    },
    [overrides],
  );

  const moduleTitle = useCallback(
    (moduleId: string, baseTitle: string): string =>
      overrides.modules[moduleId]?.title ?? baseTitle,
    [overrides],
  );

  const sortModules = useCallback(
    <T extends { id: string }>(modules: T[]): T[] =>
      [...modules].sort((a, b) => {
        const orderA = overrides.modules[a.id]?.order ?? modules.findIndex((m) => m.id === a.id);
        const orderB = overrides.modules[b.id]?.order ?? modules.findIndex((m) => m.id === b.id);
        return orderA - orderB;
      }),
    [overrides],
  );

  const value = useMemo(
    () => ({
      overrides,
      editMode,
      setEditMode,
      applyToModule,
      moduleTitle,
      sortModules,
      saveModuleOverride,
      saveMenuOrder,
    }),
    [overrides, editMode, applyToModule, moduleTitle, sortModules, saveModuleOverride, saveMenuOrder],
  );

  return <UiConfigContext.Provider value={value}>{children}</UiConfigContext.Provider>;
}
