import { useMemo, useState, type ReactNode } from 'react';
import { FileDown, FileSpreadsheet, FileUp, Filter, Pencil, Plus, Search, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';
import { useRefMaps } from '../../hooks/useRefMaps';
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from '../../services/firestoreService';
import {
  downloadExcelTemplate,
  exportToExcel,
  type TemplateField,
} from '../../services/excelExport';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable, type SortDirection, type TableColumn } from '../ui/DataTable';
import { Spinner } from '../ui/Spinner';
import { CrudForm } from './CrudForm';
import { DetailModal } from './DetailModal';
import { ImportCsvModal } from './ImportCsvModal';
import { ExportExcelModal } from './ExportExcelModal';
import { RecordDetailModal } from './RecordDetailModal';
import { TableLayoutModal } from './TableLayoutModal';
import { useUiConfig } from '../../hooks/useUiConfig';
import { FilterPanel, type ColumnFilter, type FiltersState } from './FilterPanel';
import { Pagination } from '../ui/Pagination';
import { displayValue } from './displayValue';
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
  const { can, firebaseUser, isAdmin } = useAuth();
  const { editMode, applyToModule } = useUiConfig();
  /** Configuración efectiva: títulos, etiquetas y orden personalizados por el admin. */
  const config = useMemo(() => applyToModule(baseConfig), [applyToModule, baseConfig]);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const { rows, loading, error } = useCollection(config.collection);
  const refMaps = useRefMaps(config.fields);
  const detailRefMaps = useRefMaps(config.detail?.fields ?? []);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EntityData | null>(null);
  const [deleting, setDeleting] = useState<EntityData | null>(null);
  const [detailParent, setDetailParent] = useState<EntityData | null>(null);
  const [viewing, setViewing] = useState<EntityData | null>(null);
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

  const refLabel = (collection: string, id: string): string =>
    refMaps[collection]?.labels.get(id) ?? '—';

  const tableFields = useMemo(
    () => config.fields.filter((f) => f.table !== false),
    [config.fields],
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
          return matchesFilter(field, row[key] ?? null, filter);
        }),
      );
    }
    if (term) {
      result = result.filter((row) =>
        config.fields.some((field) =>
          displayValue(field, row[field.key] ?? null, refLabel).toLowerCase().includes(term),
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

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return filteredRows;
    const field = config.fields.find((f) => f.key === sortKey);
    if (!field) return filteredRows;
    const direction = sortDir === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const rawA = a[sortKey] ?? null;
      const rawB = b[sortKey] ?? null;
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
  }, [filteredRows, sortKey, sortDir, config.fields, refMaps]);

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
          const text = displayValue(field, (row as EntityData)[field.key] ?? null, refLabel);
          if (STATUS_KEYS.has(field.key) && text !== '—') {
            return <Badge value={text} />;
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
    setFormOpen(true);
  };

  const openEdit = (row: EntityData) => {
    setEditing(row);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (values: Record<string, FieldValue>, keepOpen: boolean) => {
    setBusy(true);
    setFormError(null);
    try {
      const payload = { ...values };
      if (config.autoUserField && firebaseUser && !editing) {
        payload[config.autoUserField] = firebaseUser.uid;
      }
      if (editing) {
        await updateDocument(config.collection, editing.id, payload);
      } else {
        await createDocument(config.collection, payload);
      }
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
    const idField: TemplateField = {
      label: 'ID',
      required: false,
      type: 'text',
      hint:
        'AppSheet ID (optional). When present it becomes the identifier: re-importing with the same ID updates the record instead of duplicating it. Reference columns accept this ID or the name.',
    };
    const dataFields: TemplateField[] = config.fields
      .filter((field) => field.form !== false)
      .map((field) => {
      let options: string[] | undefined;
      let hint = 'Text';
      switch (field.type) {
        case 'enum':
          options = [...(field.enumValues ?? [])];
          hint = `One of: ${(field.enumValues ?? []).join(', ')}`;
          break;
        case 'bool':
          options = ['YES', 'NO'];
          hint = 'YES or NO';
          break;
        case 'ref': {
          const refData = field.refCollection ? refMaps[field.refCollection] : undefined;
          if (refData) {
            let refRows = refData.rows;
            if (field.refFilter) {
              refRows = refRows.filter(
                (r) => r[field.refFilter!.field] === field.refFilter!.value,
              );
            }
            options = refRows
              .map((r) => refData.labels.get(r.id) ?? '')
              .filter((label) => label !== '')
              .sort((a, b) => a.localeCompare(b));
          }
          hint = 'Exact name as shown in the app (use the dropdown)';
          break;
        }
        case 'date':
          hint = 'Date DD/MM/YYYY';
          break;
        case 'number':
        case 'currency':
          hint = 'Number';
          break;
        case 'textarea':
          hint = 'Long text';
          break;
        default:
          hint = 'Text';
      }
      return { label: field.label, required: field.required === true, type: field.type, options, hint };
    });
    await downloadExcelTemplate(config.title, [idField, ...dataFields]);
  };

  /** Exporta con su propio rango de fechas, independiente de búsqueda y filtros. */
  const handleExport = async (dateField: string, from: string, to: string) => {
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
      config.fields.map((field) => ({
        header: field.label,
        values: rowsForExport.map((row) =>
          displayValue(field, row[field.key] ?? null, refLabel),
        ),
      })),
    );
  };

  return (
    <section className="crud">
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
          <button
            type="button"
            className="btn btn-outline"
            title="Download the Excel template to fill (import is done with CSV)"
            onClick={() => void handleTemplate()}
          >
            <FileDown size={16} />
            <span className="crud-btn-text">Template</span>
          </button>
          {canCreate ? (
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
          {editMode && isAdmin ? (
            <button
              type="button"
              className="btn btn-primary"
              title="Rename headers and reorder columns"
              onClick={() => setLayoutOpen(true)}
            >
              <Pencil size={15} />
              <span className="crud-btn-text">Edit table</span>
            </button>
          ) : null}
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
          <button type="button" className="btn btn-outline" onClick={() => setExportOpen(true)}>
            <FileSpreadsheet size={16} />
            <span className="crud-btn-text">Export Excel</span>
          </button>
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
        <DataTable
          columns={columns}
          rows={pageRows}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={openEdit}
          onDelete={(row) => setDeleting(row)}
          detailLabel={config.detail ? config.detail.title : undefined}
          onDetail={config.detail ? (row) => setDetailParent(row) : undefined}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(row) => setViewing(row)}
        />
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
        fields={config.fields}
        filters={filters}
        refMaps={refMaps}
        onChange={setColumnFilter}
        onClearAll={() => {
          setFilters({});
          setPage(1);
        }}
        onClose={() => setFilterOpen(false)}
      />

      {viewing ? (
        <RecordDetailModal
          title={config.title}
          fields={config.fields}
          record={viewing}
          refLabels={refLabel}
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

      {layoutOpen ? (
        <TableLayoutModal base={baseConfig} onClose={() => setLayoutOpen(false)} />
      ) : null}

      {exportOpen ? (
        <ExportExcelModal
          title={config.title}
          fields={config.fields}
          onClose={() => setExportOpen(false)}
          onExport={handleExport}
        />
      ) : null}

      <CrudForm
        open={formOpen}
        title={editing ? `Edit · ${config.title}` : `Add · ${config.title}`}
        fields={config.fields}
        initial={editing}
        refMaps={refMaps}
        busy={busy}
        error={formError}
        resetSignal={resetSignal}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
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
          fields={config.fields.filter((f) => f.form !== false)}
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
