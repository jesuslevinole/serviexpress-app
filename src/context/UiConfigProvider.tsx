import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import {
  UiConfigContext,
  type FieldOverride,
  type ModuleOverride,
  type UiOverrides,
} from './uiConfigContext';
import type { FieldConfig, ModuleConfig } from '../types/models';

const OVERRIDES_DOC = { collection: 'settings_ui', id: 'overrides' } as const;

const EMPTY: UiOverrides = { modules: {} };

/**
 * Loads and persists the admin UI customization (renamed titles, headers
 * and ordering) from Firestore, and exposes helpers to apply it.
 */
export function UiConfigProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<UiOverrides>(EMPTY);
  const [editMode, setEditMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { firebaseUser } = useAuth();

  /**
   * La configuración vive en Firestore y las reglas exigen sesión iniciada:
   * la suscripción se abre SOLO cuando ya hay usuario. Un error de lectura no
   * borra lo que ya se cargó (así un corte de red no revierte la vista).
   */
  useEffect(() => {
    if (!firebaseUser) return;
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
        setSaveError(null);
      },
      (error) => {
        setSaveError(`The shared layout could not be read: ${error.message}`);
      },
    );
  }, [firebaseUser]);

  const persist = useCallback(async (next: UiOverrides) => {
    try {
      await setDoc(doc(db, OVERRIDES_DOC.collection, OVERRIDES_DOC.id), next);
      setSaveError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      setSaveError(`The layout could not be saved for everyone: ${message}`);
      throw error;
    }
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

  /** Aplica etiquetas, orden, obligatorio y visibilidad a una lista de campos. */
  const applyFieldOverrides = (
    baseFields: FieldConfig[],
    fieldOverrides: Record<string, FieldOverride>,
  ): FieldConfig[] =>
    baseFields
      .map((field, index) => {
        const override = fieldOverrides[field.key];
        let next = field;
        if (
          override?.label !== undefined ||
          override?.required !== undefined ||
          override?.table !== undefined
        ) {
          next = {
            ...field,
            ...(override.label !== undefined ? { label: override.label } : {}),
            ...(override.required !== undefined && field.compute === undefined
              ? { required: override.required }
              : {}),
            ...(override.table !== undefined ? { table: override.table } : {}),
          };
        }
        return { field: next, order: override?.order ?? index };
      })
      .sort((a, b) => a.order - b.order)
      .map((item) => item.field);

  const applyToModule = useCallback(
    (base: ModuleConfig): ModuleConfig => {
      const moduleOverride = overrides.modules[base.id];
      if (!moduleOverride) return base;
      const fieldOverrides = moduleOverride.fields ?? {};
      const fields = base.fields
        .map((field, index) => {
          const override = fieldOverrides[field.key];
          let next = field;
          if (
            override?.label !== undefined ||
            override?.required !== undefined ||
            override?.table !== undefined
          ) {
            next = {
              ...field,
              ...(override.label !== undefined ? { label: override.label } : {}),
              ...(override.required !== undefined && field.compute === undefined
                ? { required: override.required }
                : {}),
              ...(override.table !== undefined ? { table: override.table } : {}),
            };
          }
          return { field: next, order: override?.order ?? index };
        })
        .sort((a, b) => a.order - b.order)
        .map((item) => item.field);
      // Pestañas configuradas por el admin: sustituyen a las del código.
      const formSteps = moduleOverride.formSteps ?? base.formSteps;
      // El detalle usa sus propios overrides bajo el id "<módulo>__detail".
      const detailOverride = overrides.modules[`${base.id}__detail`];
      const detail =
        base.detail && detailOverride
          ? {
              ...base.detail,
              title: detailOverride.title ?? base.detail.title,
              fields: applyFieldOverrides(base.detail.fields, detailOverride.fields ?? {}),
            }
          : base.detail;

      return {
        ...base,
        title: moduleOverride.title ?? base.title,
        fields,
        ...(formSteps ? { formSteps } : {}),
        ...(detail ? { detail } : {}),
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
      saveError,
    }),
    [
      overrides,
      editMode,
      applyToModule,
      moduleTitle,
      sortModules,
      saveModuleOverride,
      saveMenuOrder,
      saveError,
    ],
  );

  return <UiConfigContext.Provider value={value}>{children}</UiConfigContext.Provider>;
}