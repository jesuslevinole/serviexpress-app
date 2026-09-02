import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchDocumentCachedFirst, subscribeToCollection } from '../services/firestoreService';
import {
  clearCaptureWindow,
  resolveOccurrence,
  saveCaptureWindow,
  subscribeToCaptureWindow,
  type CaptureWindow,
  type CaptureWindowStatus,
  type WindowOccurrence,
} from '../services/captureWindow';
import type { EntityData, ModuleConfig } from '../types/models';

/** Renglón que ya capturó un elemento del catálogo dentro de la ventana. */
export interface TakenInfo {
  rowId: string;
  parentId: string;
  /** Encabezado (el BC Report) al que pertenece el renglón, si ya se resolvió. */
  parent: EntityData | null;
}

export interface CaptureWindowInfo {
  /** null cuando el módulo no usa ventana de captura. */
  window: CaptureWindow | null;
  loading: boolean;
  /** Reloj compartido (se actualiza cada pocos segundos, no cada segundo). */
  now: number;
  status: CaptureWindowStatus;
  /** Mensaje si el horario no se pudo LEER (cuota/conexión); null si cargó. */
  loadError: string | null;
  /** Aparición semanal vigente: la abierta ahora o, si no, la próxima. */
  occurrence: WindowOccurrence | null;
  /** id del catálogo -> renglón que ya lo capturó en ESTA ventana. */
  taken: Map<string, TakenInfo>;
  /** id del catálogo -> motivo por el que hoy no se puede capturar (taller, correctivo). */
  blocked: Map<string, string>;
  /** Registros activos del catálogo a cubrir (los camiones). */
  sourceRows: EntityData[];
  /** TODOS los registros del catálogo, incluidos inactivos (para explicar motivos). */
  sourceRowsAll: EntityData[];
  save: (window: Omit<CaptureWindow, 'updatedBy'>) => Promise<void>;
  clear: () => Promise<void>;
}

/** Cada cuánto se refresca el reloj compartido del módulo. */
const TICK_MS = 15 * 1000;

import { isActiveRecord as isActive } from '../services/activeStatus';

/**
 * Resuelve todo lo que la ventana de captura necesita saber: si está abierta,
 * qué elementos del catálogo ya se capturaron en ella (y en qué registro),
 * y cuáles están bloqueados por otras colecciones. Un solo hook alimenta el
 * aviso del módulo, el formulario del alta y el detalle.
 */
export function useCaptureWindow(
  config: ModuleConfig,
  parents: EntityData[],
  /**
   * Estaciones del usuario acotado: los renglones de la semana se piden al
   * servidor SOLO de esas estaciones (con índice compuesto); si el índice no
   * existe aún, se cae solo al modo completo sin romper nada.
   */
  scopeStations: string[] = [],
): CaptureWindowInfo {
  const spec = config.captureWindow ?? null;
  const detail = config.detail ?? null;
  const { firebaseUser } = useAuth();

  const [window, setWindow] = useState<CaptureWindow | null>(null);
  const [loading, setLoading] = useState(spec !== null);
  /** Error al LEER el horario (cuota agotada, sin conexión): no es "sin ventana". */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [windowRows, setWindowRows] = useState<EntityData[]>([]);
  const [blockedRows, setBlockedRows] = useState<Record<string, EntityData[]>>({});
  const [sourceAll, setSourceAll] = useState<EntityData[]>([]);
  /** Encabezados que no estaban en la lista del módulo, leídos uno a uno. */
  const [extraParents, setExtraParents] = useState<Record<string, EntityData | null>>({});

  // Reloj: suficiente para habilitar/deshabilitar botones; el conteo fino
  // (segundos) lo lleva el aviso por su cuenta.
  useEffect(() => {
    if (!spec) return;
    const timer = globalThis.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => globalThis.clearInterval(timer);
  }, [spec]);

  // La ventana configurada por el admin.
  const windowId = spec?.id ?? '';
  useEffect(() => {
    if (windowId === '') return;
    setLoading(true);
    return subscribeToCaptureWindow(
      windowId,
      (data) => {
        setWindow(data);
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        setLoadError(error.message);
        setLoading(false);
      },
    );
  }, [windowId]);

  /** Aparición vigente (o próxima) de la ventana semanal, según el reloj. */
  const { status, occurrence } = useMemo(
    () => (spec ? resolveOccurrence(window, now) : { status: 'unset' as const, occurrence: null }),
    [spec, window, now],
  );

  // Renglones capturados dentro de la aparición vigente: se piden al servidor
  // por su fecha de creación, así solo viajan los de esta semana y no todo el
  // histórico.
  const detailCollection = detail?.collection ?? '';
  const startAt = occurrence?.startAt ?? '';
  const endAt = occurrence?.endAt ?? '';
  /** true = el índice compuesto no existe; usar el modo completo. */
  const [scopedDetailFailed, setScopedDetailFailed] = useState(false);
  const scopeKey =
    scopeStations.length > 0 && scopeStations.length <= 30 ? scopeStations.join(',') : '';
  useEffect(() => {
    if (!spec || detailCollection === '' || startAt === '' || endAt === '') {
      setWindowRows([]);
      return;
    }
    const useScoped = scopeKey !== '' && !scopedDetailFailed;
    return subscribeToCollection(
      detailCollection,
      setWindowRows,
      (error) => {
        // Sin índice compuesto (failed-precondition): reintentar sin alcance.
        if (useScoped && /index|precondition/i.test(error.message)) {
          console.warn('[capture] scoped detail query needs an index, falling back', error.message);
          setScopedDetailFailed(true);
          return;
        }
        setWindowRows([]);
      },
      undefined,
      {
        clauses: [
          ...(useScoped
            ? [{ field: 'idStation', op: 'in' as const, values: scopeKey.split(',') }]
            : []),
          { field: 'createdAt', op: 'range' as const, from: startAt, to: endAt },
        ],
      },
    );
  }, [spec, detailCollection, startAt, endAt, scopeKey, scopedDetailFailed]);

  // Colecciones que bloquean (taller abierto, correctivo pendiente): solo los
  // documentos con estatus abierto, que son pocos.
  const blockedKey = spec
    ? spec.blockedBy.map((b) => `${b.collection}|${b.statusKey}|${b.openValues.join(',')}`).join('#')
    : '';
  useEffect(() => {
    if (!spec) return;
    const unsubscribers = spec.blockedBy.map((block) =>
      subscribeToCollection(
        block.collection,
        (rows) => setBlockedRows((prev) => ({ ...prev, [block.collection]: rows })),
        () => setBlockedRows((prev) => ({ ...prev, [block.collection]: [] })),
        undefined,
        { clauses: [{ field: block.statusKey, op: 'in', values: block.openValues }] },
      ),
    );
    return () => unsubscribers.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedKey]);

  // El catálogo a cubrir (comparte listener con los refMaps del módulo).
  const sourceCollection = spec?.once.sourceCollection ?? '';
  useEffect(() => {
    if (sourceCollection === '') return;
    return subscribeToCollection(sourceCollection, setSourceAll, () => setSourceAll([]));
  }, [sourceCollection]);

  const sourceRows = useMemo(
    () => (spec ? sourceAll.filter((row) => isActive(row, spec.once.sourceActiveKey)) : []),
    [sourceAll, spec],
  );

  /** Encabezado de un renglón: de la lista del módulo o leído aparte. */
  const parentById = useMemo(() => {
    const map = new Map<string, EntityData>();
    parents.forEach((row) => map.set(row.id, row));
    Object.entries(extraParents).forEach(([id, row]) => {
      if (row && !map.has(id)) map.set(id, row);
    });
    return map;
  }, [parents, extraParents]);

  // Encabezados fuera de la lista del módulo (más viejos que el tope): se
  // leen una vez para poder decir quién y dónde capturó el camión.
  const parentKey = detail?.parentKey ?? '';
  const missingParentIds = useMemo(() => {
    if (parentKey === '') return [];
    const ids = new Set<string>();
    windowRows.forEach((row) => {
      const id = row[parentKey];
      if (typeof id === 'string' && id !== '' && !parentById.has(id) && !(id in extraParents)) {
        ids.add(id);
      }
    });
    return [...ids];
  }, [windowRows, parentKey, parentById, extraParents]);
  const missingKey = missingParentIds.join('|');
  useEffect(() => {
    if (missingKey === '' || config.collection === '') return;
    let cancelled = false;
    void Promise.all(
      missingKey.split('|').map(async (id) => [id, await fetchDocumentCachedFirst(config.collection, id)] as const),
    ).then((results) => {
      if (cancelled) return;
      setExtraParents((prev) => {
        const next = { ...prev };
        results.forEach(([id, row]) => {
          next[id] = row;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [missingKey, config.collection]);

  const taken = useMemo(() => {
    const map = new Map<string, TakenInfo>();
    if (!spec || parentKey === '') return map;
    const key = spec.once.detailKey;
    // Del más antiguo al más reciente: el primero que lo capturó es el que cuenta.
    [...windowRows]
      .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
      .forEach((row) => {
        const target = row[key];
        const parentId = row[parentKey];
        if (typeof target !== 'string' || target === '' || map.has(target)) return;
        map.set(target, {
          rowId: row.id,
          parentId: typeof parentId === 'string' ? parentId : '',
          parent: typeof parentId === 'string' ? (parentById.get(parentId) ?? null) : null,
        });
      });
    return map;
  }, [spec, windowRows, parentKey, parentById]);

  const blocked = useMemo(() => {
    const map = new Map<string, string>();
    if (!spec) return map;
    spec.blockedBy.forEach((block) => {
      (blockedRows[block.collection] ?? []).forEach((row) => {
        if (block.match && !block.match(row)) return;
        const target = row[block.refKey];
        if (typeof target !== 'string' || target === '' || map.has(target)) return;
        map.set(target, block.label);
      });
    });
    return map;
  }, [spec, blockedRows]);

  const save = useCallback(
    async (next: Omit<CaptureWindow, 'updatedBy'>) => {
      if (!spec) return;
      await saveCaptureWindow(spec.id, next, firebaseUser?.uid ?? null);
    },
    [spec, firebaseUser],
  );

  const clear = useCallback(async () => {
    if (!spec) return;
    await clearCaptureWindow(spec.id);
  }, [spec]);

  return {
    window: spec ? window : null,
    loading: spec ? loading : false,
    now,
    status,
    loadError,
    occurrence,
    taken,
    blocked,
    sourceRows,
    sourceRowsAll: sourceAll,
    save,
    clear,
  };
}
