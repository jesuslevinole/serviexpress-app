import { useMemo, useState, type ReactNode } from 'react';
import { FileDown, FileSpreadsheet, FileUp, Plus, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';
import { useRefMaps } from '../../hooks/useRefMaps';
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from '../../services/firestoreService';
import { exportToExcel } from '../../services/excelExport';
import { downloadCsvTemplate } from '../../services/csv';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable, type TableColumn } from '../ui/DataTable';
import { Spinner } from '../ui/Spinner';
import { CrudForm } from './CrudForm';
import { DetailModal } from './DetailModal';
import { ImportCsvModal } from './ImportCsvModal';
import { displayValue } from './displayValue';
import type { EntityData, FieldValue, ModuleConfig } from '../../types/models';
import './CrudModule.css';

interface CrudModuleProps {
  config: ModuleConfig;
  headerExtra?: ReactNode;
}

const STATUS_KEYS = new Set(['status', 'dlStatus', 'dotStatus', 'qcStatus']);

/**
 * Motor CRUD completo de un módulo: tabla con búsqueda, alta/edición en modal,
 * eliminación con confirmación, permisos por rol, detalle maestro-detalle
 * y exportación a Excel. TODOS los módulos del app usan este componente.
 */
export function CrudModule({ config, headerExtra }: CrudModuleProps) {
  const { can, firebaseUser } = useAuth();
  const { rows, loading, error } = useCollection(config.collection);
  const refMaps = useRefMaps(config.fields);
  const detailRefMaps = useRefMaps(config.detail?.fields ?? []);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EntityData | null>(null);
  const [deleting, setDeleting] = useState<EntityData | null>(null);
  const [detailParent, setDetailParent] = useState<EntityData | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionIds, setSessionIds] = useState<ReadonlySet<string>>(new Set());
  const [resetSignal, setResetSignal] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

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
    if (!term) return rows;
    return rows.filter((row) =>
      config.fields.some((field) =>
        displayValue(field, row[field.key] ?? null, refLabel).toLowerCase().includes(term),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, config.fields, refMaps]);

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
        setSessionIds((prev) => new Set(prev).add(editing.id));
      } else {
        const newId = await createDocument(config.collection, payload);
        setSessionIds((prev) => new Set(prev).add(newId));
      }
      if (keepOpen && !editing) {
        setResetSignal((n) => n + 1);
      } else {
        setFormOpen(false);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar');
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

  const handleExport = async () => {
    const exportFields = config.fields;
    await exportToExcel(
      config.title,
      exportFields.map((field) => ({
        header: field.label,
        values: filteredRows.map((row) =>
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
            placeholder={`Buscar en ${config.title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="crud-toolbar-actions">
          {headerExtra}
          <button
            type="button"
            className="btn btn-outline"
            title="Descargar plantilla CSV para llenar en Google Sheets"
            onClick={() => downloadCsvTemplate(config.title, config.fields)}
          >
            <FileDown size={16} />
            <span className="crud-btn-text">Plantilla</span>
          </button>
          {canCreate ? (
            <button
              type="button"
              className="btn btn-outline"
              title="Importar registros desde un CSV"
              onClick={() => setImportOpen(true)}
            >
              <FileUp size={16} />
              <span className="crud-btn-text">Importar CSV</span>
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={handleExport}>
            <FileSpreadsheet size={16} />
            <span className="crud-btn-text">Exportar Excel</span>
          </button>
          {canCreate ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              <span className="crud-btn-text">Agregar</span>
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="crud-error">Error al cargar: {error}</p> : null}

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={filteredRows}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={openEdit}
          onDelete={(row) => setDeleting(row)}
          detailLabel={config.detail ? config.detail.title : undefined}
          onDetail={config.detail ? (row) => setDetailParent(row) : undefined}
        />
      )}

      <CrudForm
        open={formOpen}
        title={editing ? `Editar · ${config.title}` : `Agregar · ${config.title}`}
        fields={config.fields}
        initial={editing}
        refMaps={refMaps}
        busy={busy}
        error={formError}
        summaryRows={rows}
        sessionIds={sessionIds}
        resetSignal={resetSignal}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar registro"
        message="¿Seguro que quieres eliminar este registro? Esta acción no se puede deshacer."
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      {importOpen ? (
        <ImportCsvModal
          title={config.title}
          collection={config.collection}
          fields={config.fields}
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