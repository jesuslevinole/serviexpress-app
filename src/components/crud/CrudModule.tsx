import { useEffect, useMemo, useState, type ReactNode, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileDown,
  FileSpreadsheet,
  FileUp,
  Filter,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';
import { useRefMaps } from '../../hooks/useRefMaps';
import {
  createDocument,
  fetchCollection,
  setDocument,
  deleteDocument,
  updateDocument,
} from '../../services/firestoreService';
import { downloadExcelTemplate, exportToExcel } from '../../services/excelExport';
import { buildTemplateFields } from './templateFields';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable, type SortDirection, type TableColumn } from '../ui/DataTable';
import { Spinner } from '../ui/Spinner';
import { CrudForm } from './CrudForm';
import { DetailModal } from './DetailModal';
import { DraftDetailRows, type DraftRow } from './DraftDetailRows';
import { CoverageBanner } from './CoverageBanner';
import { ImportCsvModal } from './ImportCsvModal';
import { ExportExcelModal } from './ExportExcelModal';
import { RecordDetailModal } from './RecordDetailModal';
import { TableLayoutModal } from './TableLayoutModal';
import { FormStepsModal } from './FormStepsModal';
import { RelatedList, RelatedRecordsModal } from './RelatedRecordsModal';
import { DetailSummary } from './DetailSummary';
import { useUiConfig } from '../../hooks/useUiConfig';
import { useScopeFilter } from '../../hooks/useScope';
import { COLLECTIONS, REF_LABEL_DEPENDENCIES, buildRefLabel } from '../../config/collections';
import { FilterPanel, type ColumnFilter, type FiltersState } from './FilterPanel';
import { Pagination } from '../ui/Pagination';
import { displayCell, displayValue, effectiveValue, scalar } from './displayValue';
import type { EntityData, FieldValue, ModuleConfig } from '../../types/models';
import './CrudModule.css';

interface CrudModuleProps {
  config: ModuleConfig;
  headerExtra?: ReactNode;
}

const STATUS_KEYS = new Set(['status', 'dlStatus', 'dotStatus', 'qcStatus']);

const PAGE_SIZE = 50;

/** ¿La fila pasa el filtro de esta columna? */
function matchesFilter(field: { type: string }, value: unknown, filter: ColumnFilter): boolean {
  switch (field.type) {
    case 'enum':
    case 'ref':
      return !filter.equals || value === filter.equals;
    case 'bool':
      if (filter.boolValue === 'SI') return value === true;
      if (filter.boolValue === 'NO') return value !== true;
      return true;
    case 'date': {
      const v = typeof value === 'string' ? value : '';
      if (filter.from && (v === '' || v < filter.from)) return false;
      if (filter.to && (v === '' || v > filter.to)) return false;
      return true;
    }
    case 'number':
    case 'currency': {
      const v = typeof value === 'number' ? value : null;
      const from = filter.from !== undefined && filter.from !== '' ? Number(filter.from) : null;
      const to = filter.to !== undefined && filter.to !== '' ? Number(filter.to) : null;
      if (from !== null && (v === null || v < from)) return false;
      if (to !== null && (v === null || v > to)) return false;
      return true;
    }
    default: {
      const term = (filter.text ?? '').trim().toLowerCase();
      if (!term) return true;
      return String(value ?? '').toLowerCase().includes(term);
    }
  }
}

/**
 * Motor CRUD completo de un módulo: tabla con búsqueda, alta/edición en modal,
 * eliminación con confirmación, permisos por rol, detalle maestro-detalle
 * y exportación a Excel. TODOS los módulos del app usan este componente.
 */
export function CrudModule({ config: baseConfig, headerExtra }: CrudModuleProps) {
  const { can, canOr, firebaseUser, isAdmin, profile } = useAuth();
  const { editMode, applyToModule } = useUiConfig();
  /** Configuración efectiva: títulos, etiquetas y orden personalizados por el admin. */
  const config = useMemo(() => applyToModule(baseConfig), [applyToModule, baseConfig]);
  const [layoutOpen, setLayoutOpen] = useState(false);
  /** Puede personalizar layout y obligatorios: admin o rol con permiso Customization. */
  const canCustomize = isAdmin || can('customize', 'editar');
  /** Puede editar el campo "Captured by": admin o rol con ese permiso en Roles. */
  const canEditCapturedBy =
    config.autoUserField !== undefined && (isAdmin || can('capturedBy', 'editar'));

  /**
   * ¿La fila puede abrir su subtabla? Solo si el campo condicionado apunta a un
   * registro con el nombre esperado (p. ej. tipo de solicitud = "Uniforms").
   */
  const detailEnabled = (row: EntityData): boolean => {
    const condition = config.detail?.enabledWhen;
    if (!condition) return true;
    const value = row[condition.field];
    if (typeof value !== 'string' || value === '') return false;
    const field = config.fields.find((f) => f.key === condition.field);
    const label = field?.refCollection ? refLabel(field.refCollection, value) : value;
    return condition.refNameIn.some((name) => name.toLowerCase() === label.toLowerCase());
  };

  /** Puede editar Entity/Station en formularios: admin o permiso entityStation. */
  const canEditContext = isAdmin || can('entityStation', 'editar');

  /**
   * Campos que el rol puede ver. Los marcados con requiresAction (dinero,
   * notas internas) se ocultan salvo que la matriz de permisos los habilite.
   * Se filtra una sola vez y de ahí salen tabla, formulario, detalle y Excel,
   * para que un dato restringido no se escape por ninguna vía.
   */
  const allowedFields = useMemo(
    () =>
      config.fields.filter(
        (field) => !field.requiresAction || isAdmin || can(config.id, field.requiresAction),
      ),
    [config.fields, config.id, isAdmin, can],
  );

  /** Valores iniciales desde el alcance del usuario (su entidad/estación asignada). */
  const scopePresets = useMemo(
    () =>
      Object.fromEntries(
        config.fields
          .filter((f) => f.defaultFromUserScope !== undefined)
          .map((f) => [
            f.key,
            f.defaultFromUserScope === 'entity'
              ? (profile?.scopeEntities?.[0] ?? null)
              : (profile?.scopeStations?.[0] ?? null),
          ]),
      ),
    [config.fields, profile],
  );
  const { rows: allRows, loading, error } = useCollection(config.collection);
  const [activeTab, setActiveTab] = useState(config.viewTabs?.[0]?.id ?? 'all');
  const scopeFilter = useScopeFilter();
  /** Filas dentro del alcance (entidades/estaciones asignadas al usuario). */
  const rows = useMemo(() => {
    const inScope = allRows.filter((row) => scopeFilter(config, row));
    const tab = config.viewTabs?.find((item) => item.id === activeTab);
    return tab?.match ? inScope.filter(tab.match) : inScope;
  }, [allRows, scopeFilter, config, activeTab]);

  /** Conteo por pestaña, calculado sobre lo que el usuario puede ver. */
  const tabCounts = useMemo(() => {
    if (!config.viewTabs) return {};
    const inScope = allRows.filter((row) => scopeFilter(config, row));
    return Object.fromEntries(
      config.viewTabs.map((tab) => [tab.id, tab.match ? inScope.filter(tab.match).length : inScope.length]),
    );
  }, [allRows, scopeFilter, config]);
  const refMaps = useRefMaps(config.fields);

  const detailRefMaps = useRefMaps(config.detail?.fields ?? []);
  const detailRefLabel = (collection: string, id: string): string =>
    detailRefMaps[collection]?.labels.get(id) ?? refLabel(collection, id);
  const rowsOfParent = (parentId: string): EntityData[] =>
    config.detail
      ? detailRowsAll.rows.filter((row) => row[config.detail!.parentKey] === parentId)
      : [];

  /** Alcance por usuario (para rellenar Entity/Station al elegir capturista). */
  const userScopes = useMemo(() => {
    const usersData = refMaps[COLLECTIONS.users];
    const map: Record<string, { entity: string | null; station: string | null }> = {};
    (usersData?.rows ?? []).forEach((u) => {
      map[u.id] = {
        entity: Array.isArray(u.scopeEntities) ? (u.scopeEntities[0] ?? null) : null,
        station: Array.isArray(u.scopeStations) ? (u.scopeStations[0] ?? null) : null,
      };
    });
    return map;
  }, [refMaps]);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EntityData | null>(null);
  const [deleting, setDeleting] = useState<EntityData | null>(null);
  const [detailParent, setDetailParent] = useState<EntityData | null>(null);
  const [viewing, setViewing] = useState<EntityData | null>(null);
  /** Registros marcados para eliminar en bloque. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  /** Editor de pestañas del alta (solo administradores). */
  const [stepsOpen, setStepsOpen] = useState(false);
  /**
   * Renglones capturados dentro del alta, antes de que exista el maestro:
   * viven en memoria y se guardan en cuanto el maestro se crea.
   */
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);

  /**
   * Enlace profundo `?record=<id>`: al llegar desde el detalle de otro módulo
   * (p. ej. el camión de un mantenimiento) se abre ese registro en el visor y
   * se limpia el parámetro para no reabrirlo al navegar hacia atrás.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRecordId = searchParams.get('record');

  useEffect(() => {
    if (!requestedRecordId) return;
    const target = rows.find((row) => row.id === requestedRecordId);
    // Todavía cargando: se vuelve a intentar cuando lleguen las filas.
    if (!target) return;
    setViewing(target);
    const next = new URLSearchParams(searchParams);
    next.delete('record');
    setSearchParams(next, { replace: true });
  }, [requestedRecordId, rows, searchParams, setSearchParams]);

  /**
   * Renglones del detalle: se leen SOLO cuando hay un registro abierto en el
   * visor o en edición, y filtrados a ese registro. Así el listado del módulo
   * no arrastra la colección de detalle completa.
   */
  const openParentId = viewing?.id ?? editing?.id ?? null;
  const detailRowsAll = useCollection(
    config.detail && openParentId ? config.detail.collection : '',
    config.detail && openParentId
      ? { field: config.detail.parentKey, value: openParentId }
      : undefined,
  );
  const [historyFor, setHistoryFor] = useState<EntityData | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  /** Encabezados creados durante la importación masiva (clave de grupo -> id). */
  const bulkHeaders = useRef<Map<string, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({});
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);

  const canCreate = can(config.id, 'crear');
  const canEdit = can(config.id, 'editar');
  const canDelete = can(config.id, 'eliminar');
  /** Borrado en bloque: acción propia, más peligrosa que borrar de uno en uno. */
  const canBulkDelete = isAdmin || can(config.id, 'eliminarMasivo');
  /**
   * Botones de la barra superior. Cada uno tiene su propio permiso; los roles
   * que aún no lo definen heredan el permiso equivalente sobre los registros,
   * de modo que nadie pierde un botón que hoy usa.
   */
  const canTemplate = canOr(config.id, 'plantilla', 'crear');
  const canImport = canOr(config.id, 'importar', 'crear');
  const canExport = canOr(config.id, 'exportar', 'ver');
  const canFilter = canOr(config.id, 'filtrar', 'ver');

  /**
   * Etiqueta de una referencia. El sufijo "#campo" (que pone displayValue
   * cuando el campo usa refLabelFrom) pide mostrar solo ese dato del registro
   * apuntado, p. ej. el número de unidad sin la placa.
   */
  const refLabel = (collection: string, id: string): string => {
    const [name, only] = collection.split('#');
    if (only) {
      const row = refMaps[name]?.rows.find((r) => r.id === id);
      const value = row?.[only];
      if (typeof value === 'string' && value !== '') return value;
      if (typeof value === 'number') return String(value);
    }
    return refMaps[name]?.labels.get(id) ?? '—';
  };

  const tableFields = useMemo(
    () => allowedFields.filter((f) => f.table !== false),
    [allowedFields],
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    const activeFilters = Object.entries(filters);
    if (activeFilters.length > 0) {
      result = result.filter((row) =>
        activeFilters.every(([key, filter]) => {
          const field = config.fields.find((f) => f.key === key);
          if (!field) return true;
          return matchesFilter(field, field.compute ? field.compute(row) : scalar(row[key]), filter);
        }),
      );
    }
    if (term) {
      result = result.filter((row) =>
        config.fields.some((field) =>
          displayCell(field, row, refLabel).toLowerCase().includes(term),
        ),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, filters, config.fields, refMaps]);

  /** Ciclo de ordenamiento por columna: asc -> desc -> orden original. */
  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  /** Campo de fecha principal del módulo (para el orden por defecto). */
  const primaryDateKey = useMemo(() => {
    const named = config.fields.find((f) => f.type === 'date' && f.key === 'date');
    return named?.key ?? config.fields.find((f) => f.type === 'date')?.key ?? null;
  }, [config.fields]);

  const sortedRows = useMemo(() => {
    // Sin orden elegido: de la fecha más reciente a la más antigua.
    if (!sortKey || !sortDir) {
      if (!primaryDateKey) return filteredRows;
      return [...filteredRows].sort((a, b) => {
        const dateA = typeof a[primaryDateKey] === 'string' ? (a[primaryDateKey] as string) : '';
        const dateB = typeof b[primaryDateKey] === 'string' ? (b[primaryDateKey] as string) : '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        // Empate: la captura más reciente primero.
        return String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
      });
    }
    const field = config.fields.find((f) => f.key === sortKey);
    if (!field) return filteredRows;
    const direction = sortDir === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const rawA = field.compute ? field.compute(a) : scalar(a[sortKey]);
      const rawB = field.compute ? field.compute(b) : scalar(b[sortKey]);
      if (field.type === 'number' || field.type === 'currency') {
        const numA = typeof rawA === 'number' ? rawA : Number.NEGATIVE_INFINITY;
        const numB = typeof rawB === 'number' ? rawB : Number.NEGATIVE_INFINITY;
        return (numA - numB) * direction;
      }
      if (field.type === 'bool') {
        return ((rawA === true ? 1 : 0) - (rawB === true ? 1 : 0)) * direction;
      }
      const textA = displayValue(field, rawA, refLabel).toLowerCase();
      const textB = displayValue(field, rawB, refLabel).toLowerCase();
      return textA.localeCompare(textB, undefined, { numeric: true }) * direction;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, sortKey, sortDir, config.fields, refMaps, primaryDateKey]);

  /** Página visible (máx 50 filas). */
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedRows, safePage],
  );

  const setColumnFilter = (key: string, filter: ColumnFilter | null) => {
    setPage(1);
    setFilters((prev) => {
      const next = { ...prev };
      if (filter === null) delete next[key];
      else next[key] = filter;
      return next;
    });
  };

  /** Texto visible de un filtro activo para su chip. */
  const filterChipLabel = (key: string, filter: ColumnFilter): string => {
    const field = config.fields.find((f) => f.key === key);
    if (!field) return key;
    if (filter.text) return `${field.label}: "${filter.text}"`;
    if (filter.equals) {
      const value =
        field.type === 'ref' && field.refCollection
          ? refLabel(field.refCollection, filter.equals)
          : filter.equals;
      return `${field.label}: ${value}`;
    }
    if (filter.boolValue) return `${field.label}: ${filter.boolValue === 'SI' ? 'Yes' : 'No'}`;
    const from = filter.from ?? '';
    const to = filter.to ?? '';
    return `${field.label}: ${from || '…'} to ${to || '…'}`;
  };

  const columns: TableColumn[] = useMemo(
    () =>
      tableFields.map((field) => ({
        key: field.key,
        label: field.label,
        render: (row) => {
          const text = displayCell(field, row as EntityData, refLabel);
          if ((STATUS_KEYS.has(field.key) || field.badge === true) && text !== '—') {
            return <Badge value={text} tone={field.badgeTones?.[text]} />;
          }
          return text;
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableFields, refMaps],
  );

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    // Un alta nueva nunca arrastra los renglones de la anterior.
    setDraftRows([]);
    setFormOpen(true);
  };

  const openEdit = (row: EntityData) => {
    setEditing(row);
    setFormError(null);
    setFormOpen(true);
  };


  /** Escribe en el registro referenciado los datos marcados con syncToRefField. */
  const syncToReferences = async (values: Record<string, FieldValue>) => {
    for (const field of config.fields) {
      const spec = field.syncToRefField;
      if (!spec) continue;
      if (spec.onlyWhen && !spec.onlyWhen({ id: '', ...values })) continue;
      const targetId = values[spec.field];
      const value = values[field.key];
      const sourceField = config.fields.find((f) => f.key === spec.field);
      if (typeof targetId !== 'string' || targetId === '' || !sourceField?.refCollection) continue;
      if (value === null || value === undefined || value === '') continue;
      await setDocument(sourceField.refCollection, targetId, { [spec.targetField]: value }, true);
    }
  };

  const handleSubmit = async (values: Record<string, FieldValue>, keepOpen: boolean) => {
    setBusy(true);
    setFormError(null);
    try {
      const payload = { ...values };
      // Copia el nombre resuelto de las referencias marcadas con copyLabelTo.
      config.fields.forEach((field) => {
        if (!field.copyLabelTo || !field.refCollection) return;
        const chosen = payload[field.key];
        if (typeof chosen === 'string' && chosen !== '') {
          payload[field.copyLabelTo] = refLabel(field.refCollection, chosen);
        }
      });
      if (config.autoUserField && firebaseUser && !editing) {
        // Si el rol puede editar el capturista, se respeta su elección del formulario;
        // si no, el sistema lo llena con la sesión actual.
        const chosen = payload[config.autoUserField];
        if (!canEditCapturedBy || typeof chosen !== 'string' || chosen === '') {
          payload[config.autoUserField] = firebaseUser.uid;
        }
      }
      if (editing) {
        await updateDocument(config.collection, editing.id, payload);
        // Bitácora: deja constancia de los cambios en los campos vigilados.
        if (config.changeLog) {
          for (const key of config.changeLog.watch) {
            const before = editing[key];
            const after = payload[key];
            if (before === after) continue;
            const field = config.fields.find((f) => f.key === key);
            const asLabel = (value: unknown): string => {
              if (typeof value !== 'string' || value === '') return '—';
              return field?.refCollection ? refLabel(field.refCollection, value) : value;
            };
            await createDocument(config.changeLog.collection, {
              [config.changeLog.foreignKey]: editing.id,
              date: new Date().toISOString().slice(0, 10),
              field: key,
              fieldLabel: field?.label ?? key,
              fromLabel: asLabel(before),
              toLabel: asLabel(after),
              idUsers: firebaseUser?.uid ?? null,
            });
          }
        }
      } else {
        // Un valor que debe ser único (el camión en Fleet): se avisa quién lo
        // registró para poder preguntarle, en vez de un error sin contexto.
        const unique = config.uniqueBy;
        if (unique) {
          const value = payload[unique.field];
          const clash = rows.find((row) => row[unique.field] === value);
          if (clash) {
            const who = typeof clash.idUsers === 'string' ? refLabel(COLLECTIONS.users, clash.idUsers) : '';
            setFormError(
              `That ${unique.label} is already registered${who && who !== '—' ? ` by ${who}` : ''}. Look it up in the list and check with them before adding it again.`,
            );
            setBusy(false);
            return;
          }
        }
        const newId = await createDocument(config.collection, payload);
        // Los renglones capturados dentro del alta se guardan ya con el id
        // del maestro recién creado: así el uniforme se pide de una sola vez.
        if (config.detail && draftRows.length > 0) {
          const detail = config.detail;
          const parent: EntityData = { id: newId, ...payload };
          for (const row of draftRows) {
            const rowPayload: Record<string, FieldValue> = {
              ...row,
              [detail.parentKey]: newId,
            };
            // Fechas que fija el sistema al crear (p. ej. la de entrega).
            detail.fields.forEach((field) => {
              if (field.fixedOnCreate && field.defaultToday) {
                rowPayload[field.key] = new Date().toISOString().slice(0, 10);
              }
            });
            const rowId = await createDocument(detail.collection, rowPayload);
            if (detail.mirror) {
              await setDocument(
                detail.mirror.collection,
                `${detail.mirror.idPrefix}${rowId}`,
                detail.mirror.build(newId, parent, rowPayload),
              );
            }
          }
          setDraftRows([]);
        }
      }
      await syncToReferences(payload);
      if (keepOpen && !editing) {
        setResetSignal((n) => n + 1);
      } else {
        setFormOpen(false);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  /** Elimina de una vez todos los registros marcados. */
  const handleBulkDelete = async () => {
    setBusy(true);
    try {
      for (const id of selectedIds) {
        await deleteDocument(config.collection, id);
      }
      setSelectedIds(new Set());
      setBulkDeleting(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteDocument(config.collection, deleting.id);
      setDeleting(null);
    } catch {
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  /** Plantilla Excel con dropdowns: enums, SI/NO y nombres reales de catálogos. */
  const handleTemplate = async () => {
    await downloadExcelTemplate(config.title, buildTemplateFields(config.fields, refMaps));
  };

  /** Campos del CSV masivo: encabezado (incluido el BC) + renglón de detalle. */
  const bulkFields = useMemo(() => {
    if (!config.bulkDetailImport || !config.detail) return [];
    const headerFields = config.fields.filter((f) => f.compute === undefined);
    const rowFields = config.detail.fields.filter((f) => f.compute === undefined);
    return [...headerFields, ...rowFields];
  }, [config]);

  /**
   * Cada fila del CSV trae encabezado + renglón: se busca (o se crea) el
   * registro maestro que corresponde al grupo y el renglón se cuelga de él.
   */
  const bulkWriteRow = async (
    _docId: string | null,
    values: Record<string, FieldValue>,
  ): Promise<void> => {
    const bulk = config.bulkDetailImport;
    const detail = config.detail;
    if (!bulk || !detail) return;

    const headerValues: Record<string, FieldValue> = {};
    config.fields
      .filter((f) => f.compute === undefined)
      .forEach((field) => {
        if (values[field.key] !== undefined) headerValues[field.key] = values[field.key];
      });
    if (config.autoUserField && !headerValues[config.autoUserField] && firebaseUser) {
      headerValues[config.autoUserField] = firebaseUser.uid;
    }

    const groupKey = bulk.groupBy.map((key) => String(headerValues[key] ?? '')).join('|');
    let headerId = bulkHeaders.current.get(groupKey);

    if (!headerId) {
      // ¿Ya existe un registro maestro con esa misma combinación?
      const existing = allRows.find((row) =>
        bulk.groupBy.every((key) => String(row[key] ?? '') === String(headerValues[key] ?? '')),
      );
      headerId = existing ? existing.id : await createDocument(config.collection, headerValues);
      bulkHeaders.current.set(groupKey, headerId);
    }

    const rowValues: Record<string, FieldValue> = {};
    detail.fields
      .filter((f) => f.compute === undefined)
      .forEach((field) => {
        if (values[field.key] !== undefined) rowValues[field.key] = values[field.key];
      });
    rowValues[detail.parentKey] = headerId;

    const rowId = await createDocument(detail.collection, rowValues);
    if (detail.mirror) {
      await setDocument(
        detail.mirror.collection,
        `${detail.mirror.idPrefix}${rowId}`,
        detail.mirror.build(headerId, { id: headerId, ...headerValues }, rowValues),
      );
    }
  };

  /** Plantilla del CSV masivo: columnas del encabezado y del renglón juntas. */
  const handleBulkTemplate = async () => {
    await downloadExcelTemplate(
      config.bulkDetailImport?.title ?? config.title,
      buildTemplateFields(bulkFields, refMaps),
    );
  };

  /**
   * Exportación de renglones (p. ej. los mantenimientos de cada BC Report):
   * parte de los encabezados que el ROL permite ver, así que un usuario con
   * visibilidad "Own" solo obtiene sus propios registros.
   */
  const exportLinkedRows = async (dateField: string, from: string, to: string) => {
    const spec = config.exportRows;
    if (!spec) return;

    const parents = rows.filter((row) => {
      const raw = row[dateField];
      const value = typeof raw === 'string' ? raw.slice(0, 10) : '';
      if (from && (value === '' || value < from)) return false;
      if (to && (value === '' || value > to)) return false;
      return true;
    });
    const parentById = new Map(parents.map((parent) => [parent.id, parent]));

    // Los catálogos de las columnas del renglón (camiones, rutas, scanners)
    // NO están en los refMaps del encabezado, que solo cubren las referencias
    // del maestro. Se leen TODOS aquí, al exportar: así el archivo no depende
    // de qué listeners alcanzó a abrir el módulo ni de si ya terminaron de
    // cargar, y ninguna columna de referencia sale como "—".
    const neededCollections = new Set<string>();
    spec.columns.forEach((column) => {
      if (column.field.type === 'ref' && column.field.refCollection) {
        neededCollections.add(column.field.refCollection);
      }
    });
    // Colecciones auxiliares de las etiquetas compuestas (driver -> team).
    [...neededCollections].forEach((name) => {
      (REF_LABEL_DEPENDENCIES[name] ?? []).forEach((dep) => neededCollections.add(dep));
    });

    const catalogsById: Record<string, EntityData[]> = {};
    await Promise.all(
      [...neededCollections].map(async (collectionName) => {
        catalogsById[collectionName] = await fetchCollection(collectionName);
      }),
    );

    /** resolve(colección, id) -> nombre, para las etiquetas compuestas. */
    const resolveName = (collectionName: string, id: string): string | undefined => {
      const row = catalogsById[collectionName]?.find((r) => r.id === id);
      const name = row?.name;
      return typeof name === 'string' && name !== '' ? name : undefined;
    };

    const exportLabels: Record<string, Map<string, string>> = {};
    Object.entries(catalogsById).forEach(([collectionName, catalogRows]) => {
      const labels = new Map<string, string>();
      catalogRows.forEach((row) =>
        labels.set(row.id, buildRefLabel(collectionName, row, resolveName)),
      );
      exportLabels[collectionName] = labels;
    });

    /** Nombre de una referencia: el catálogo recién leído y, si falta, el del módulo. */
    const exportLabel = (collectionName: string, id: string): string => {
      const fresh = exportLabels[collectionName]?.get(id);
      if (fresh !== undefined && fresh !== '—') return fresh;
      return refMaps[collectionName]?.labels.get(id) ?? '—';
    };

    const allRowsOfCollection = await fetchCollection(spec.collection);
    const linked = allRowsOfCollection
      .filter((row) => {
        const parentId = row[spec.parentKey];
        return typeof parentId === 'string' && parentById.has(parentId);
      })
      .sort((a, b) => {
        const parentA = parentById.get(String(a[spec.parentKey] ?? ''));
        const parentB = parentById.get(String(b[spec.parentKey] ?? ''));
        const dateA = typeof parentA?.date === 'string' ? parentA.date : '';
        const dateB = typeof parentB?.date === 'string' ? parentB.date : '';
        return dateB.localeCompare(dateA);
      });

    const rangeSuffix = from || to ? ` (${from || 'start'} to ${to || 'today'})` : '';
    await exportToExcel(
      `${config.title}${rangeSuffix}`,
      spec.columns.map((column) => ({
        header: column.label,
        values: linked.map((row) => {
          const source =
            column.from === 'parent' ? parentById.get(String(row[spec.parentKey] ?? '')) : row;
          return source ? displayCell(column.field, source, exportLabel) : '';
        }),
      })),
      {
        generatedBy: profile?.name ?? undefined,
        alertWhenNotPositive: ['Diff Mileage', 'Difference mileage'],
      },
    );
  };

  const handleExport = async (dateField: string, from: string, to: string) => {
    if (config.exportRows) {
      await exportLinkedRows(dateField, from, to);
      return;
    }
    const rowsForExport = rows.filter((row) => {
      const raw = row[dateField];
      const value = typeof raw === 'string' ? raw.slice(0, 10) : '';
      if (from && (value === '' || value < from)) return false;
      if (to && (value === '' || value > to)) return false;
      return true;
    });
    const rangeSuffix = from || to ? ` (${from || 'start'} to ${to || 'today'})` : '';
    await exportToExcel(
      `${config.title}${rangeSuffix}`,
      // Los campos marcados exportable:false quedan fuera, para que el archivo
      // salga con las columnas exactas que espera quien lo recibe.
      allowedFields
        .filter((field) => field.exportable !== false)
        .map((field) => ({
          header: field.label,
          values: rowsForExport.map((row) => displayCell(field, row, refLabel)),
        })),
      { generatedBy: profile?.name ?? undefined },
    );
  };

  return (
    <section className="crud">
      {config.viewTabs ? (
        <div className="crud-tabs" role="tablist">
          {config.viewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeTab}
              className={`crud-tab tone-${tab.tone ?? 'plain'} ${
                tab.id === activeTab ? 'is-active' : ''
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
            >
              {tab.label}
              <span className="crud-tab-count">{tabCounts[tab.id] ?? 0}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="crud-toolbar">
        <div className="crud-search">
          <Search size={16} />
          <input
            placeholder={`Search ${config.title.toLowerCase()}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="crud-toolbar-actions">
          {headerExtra}
          {canTemplate ? (
            <button
              type="button"
              className="btn btn-outline"
              title="Download the Excel template to fill (import is done with CSV)"
              onClick={() => void handleTemplate()}
            >
              <FileDown size={16} />
              <span className="crud-btn-text">Template</span>
            </button>
          ) : null}
          {canImport ? (
            <button
              type="button"
              className="btn btn-outline"
              title="Import records from a CSV file"
              onClick={() => setImportOpen(true)}
            >
              <FileUp size={16} />
              <span className="crud-btn-text">Import CSV</span>
            </button>
          ) : null}
          {(editMode && isAdmin) || (editMode && canCustomize) ? (
            <button
              type="button"
              className="btn btn-primary"
              title="Rename headers, reorder columns and set required fields"
              onClick={() => setLayoutOpen(true)}
            >
              <Pencil size={15} />
              <span className="crud-btn-text">Edit table</span>
            </button>
          ) : null}
          {canFilter ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setFilterOpen(true)}
            >
              <Filter size={16} />
              <span className="crud-btn-text">Filters</span>
              {Object.keys(filters).length > 0 ? (
                <span className="crud-filter-count">{Object.keys(filters).length}</span>
              ) : null}
            </button>
          ) : null}
          {config.bulkDetailImport && config.detail && canCreate ? (
            <button
              type="button"
              className="btn btn-outline"
              title="Import many detail rows at once, grouped by user and date"
              onClick={() => {
                bulkHeaders.current = new Map();
                setBulkOpen(true);
              }}
            >
              <Layers size={16} />
              <span className="crud-btn-text">{config.bulkDetailImport.buttonLabel}</span>
            </button>
          ) : null}
          {canExport ? (
            <button type="button" className="btn btn-outline" onClick={() => setExportOpen(true)}>
              <FileSpreadsheet size={16} />
              <span className="crud-btn-text">Export Excel</span>
            </button>
          ) : null}
          {canCreate ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              <span className="crud-btn-text">Add</span>
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="crud-error">Loading error: {error}</p> : null}

      {Object.keys(filters).length > 0 ? (
        <div className="crud-chips">
          {Object.entries(filters).map(([key, filter]) => (
            <button
              key={key}
              type="button"
              className="crud-chip"
              title="Remove filter"
              onClick={() => setColumnFilter(key, null)}
            >
              {filterChipLabel(key, filter)}
              <X size={13} />
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <Spinner />
      ) : (
        <>
        {config.coverage ? (
          <CoverageBanner
            config={config.coverage}
            rows={rows}
            rowsAreSource={config.collection === config.coverage.sourceCollection}
          />
        ) : null}
        {canBulkDelete && selectedIds.size > 0 ? (
          <div className="crud-bulkbar">
            <span>{selectedIds.size} selected</span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setBulkDeleting(true)}
            >
              <Trash2 size={16} />
              Delete selected
            </button>
          </div>
        ) : null}
        <DataTable
          columns={columns}
          rows={pageRows}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={openEdit}
          onDelete={(row) => setDeleting(row)}
          detailLabel={config.detail ? config.detail.title : undefined}
          onDetail={config.detail ? (row) => setDetailParent(row) : undefined}
          canDetail={detailEnabled}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(row) => setViewing(row)}
          historyLabel={config.relatedViews?.[0]?.title ?? 'History'}
          onHistory={config.relatedViews ? (row) => setHistoryFor(row) : undefined}
          selectedIds={canBulkDelete ? selectedIds : undefined}
          onToggleSelect={
            canBulkDelete
              ? (id) =>
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
              : undefined
          }
          onToggleSelectAll={
            canBulkDelete
              ? () =>
                  setSelectedIds((prev) => {
                    const allShown = pageRows.every((row) => prev.has(row.id));
                    const next = new Set(prev);
                    pageRows.forEach((row) =>
                      allShown ? next.delete(row.id) : next.add(row.id),
                    );
                    return next;
                  })
              : undefined
          }
        />
        </>
      )}

      {!loading ? (
        <Pagination
          page={safePage}
          total={sortedRows.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      ) : null}

      <FilterPanel
        open={filterOpen}
        fields={allowedFields}
        filters={filters}
        refMaps={refMaps}
        onChange={setColumnFilter}
        onClearAll={() => {
          setFilters({});
          setPage(1);
        }}
        onClose={() => setFilterOpen(false)}
      />

      {bulkOpen && config.bulkDetailImport && config.detail ? (
        <ImportCsvModal
          title={config.bulkDetailImport.title}
          collection={config.detail.collection}
          fields={bulkFields}
          refMaps={refMaps}
          currentUid={firebaseUser?.uid ?? null}
          writeRow={bulkWriteRow}
          headerExtra={
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void handleBulkTemplate()}
            >
              <FileDown size={16} />
              Template
            </button>
          }
          onClose={() => setBulkOpen(false)}
        />
      ) : null}

      {historyFor && config.relatedViews ? (
        <RelatedRecordsModal
          title={config.title}
          record={historyFor}
          recordLabel={displayValue(
            config.fields[0],
            effectiveValue(config.fields[0], historyFor),
            refLabel,
          )}
          views={config.relatedViews}
          onClose={() => setHistoryFor(null)}
        />
      ) : null}

      {viewing ? (
        <RecordDetailModal
          title={config.title}
          fields={allowedFields}
          record={viewing}
          refLabels={refLabel}
          extra={
            <>
              {config.relatedViews?.map((view) => (
                <section key={view.id} className="crud-related">
                  <h3>{view.title}</h3>
                  <RelatedList view={view} recordId={viewing.id} />
                </section>
              ))}
              {config.detail && detailEnabled(viewing) ? (
                <DetailSummary
                detail={config.detail}
                rows={rowsOfParent(viewing.id)}
                refLabels={detailRefLabel}
                manageLabel={`Add ${config.detail.title.toLowerCase()}`}
                  onManage={
                    canCreate
                      ? () => {
                          const row = viewing;
                          setViewing(null);
                          setDetailParent(row);
                        }
                      : undefined
                  }
                />
              ) : null}
            </>
          }
          onEdit={
            canEdit
              ? () => {
                  const row = viewing;
                  setViewing(null);
                  openEdit(row);
                }
              : undefined
          }
          onClose={() => setViewing(null)}
        />
      ) : null}

      {stepsOpen ? (
        <FormStepsModal base={baseConfig} onClose={() => setStepsOpen(false)} />
      ) : null}

      {layoutOpen ? (
        <TableLayoutModal base={baseConfig} onClose={() => setLayoutOpen(false)} />
      ) : null}

      {exportOpen ? (
        <ExportExcelModal
          title={config.title}
          fields={allowedFields}
          onClose={() => setExportOpen(false)}
          onExport={handleExport}
        />
      ) : null}

      <CrudForm
        open={formOpen}
        title={editing ? `Edit · ${config.title}` : `Add · ${config.title}`}
        fields={allowedFields}
        steps={config.formSteps}
        onConfigureSteps={isAdmin ? () => setStepsOpen(true) : undefined}
        initial={editing}
        refMaps={refMaps}
        busy={busy}
        error={formError}
        resetSignal={resetSignal}
        onConfigure={canCustomize ? () => setLayoutOpen(true) : undefined}
        renderExtra={
          !editing && config.detail && canCreate
            ? (values) =>
                detailEnabled({ id: '', ...values }) ? (
                  <DraftDetailRows
                    detail={config.detail!}
                    rows={draftRows}
                    refMaps={detailRefMaps}
                    refLabels={detailRefLabel}
                    onChange={setDraftRows}
                  />
                ) : null
            : undefined
        }
        extraSection={
          editing && config.detail && detailEnabled(editing) ? (
            <DetailSummary
              detail={config.detail}
              rows={rowsOfParent(editing.id)}
              refLabels={detailRefLabel}
              manageLabel={`Add ${config.detail.title.toLowerCase()}`}
              onManage={
                canCreate
                  ? () => {
                      const row = editing;
                      setFormOpen(false);
                      setDetailParent(row);
                    }
                  : undefined
              }
            />
          ) : undefined
        }
        editableCapturedByKey={canEditCapturedBy ? config.autoUserField : undefined}
        currentUid={firebaseUser?.uid ?? null}
        presetValues={scopePresets}
        userScopes={userScopes}
        contextEditable={canEditContext}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={bulkDeleting}
        title={`Delete ${selectedIds.size} record(s)`}
        message={`You are about to delete ${selectedIds.size} record(s). This action cannot be undone.`}
        busy={busy}
        onCancel={() => setBulkDeleting(false)}
        onConfirm={handleBulkDelete}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      {importOpen ? (
        <ImportCsvModal
          title={config.title}
          collection={config.collection}
          fields={config.fields.filter(
            (f) => f.compute === undefined && (f.form !== false || f.importable === true),
          )}
          refMaps={refMaps}
          autoUserField={config.autoUserField}
          currentUid={firebaseUser?.uid ?? null}
          onClose={() => setImportOpen(false)}
        />
      ) : null}

      {config.detail && detailParent ? (
        <DetailModal
          moduleId={config.id}
          detail={config.detail}
          parent={detailParent}
          parentTitle={config.title}
          refMaps={detailRefMaps}
          onClose={() => setDetailParent(null)}
        />
      ) : null}
    </section>
  );
}