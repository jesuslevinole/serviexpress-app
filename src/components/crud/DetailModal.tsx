import { useMemo, useState } from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';
import type { RefMaps } from '../../hooks/useRefMaps';
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from '../../services/firestoreService';
import { exportToExcel } from '../../services/excelExport';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable, type TableColumn } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { CrudForm } from './CrudForm';
import { displayValue } from './displayValue';
import type { DetailConfig, EntityData, FieldValue } from '../../types/models';
import './DetailModal.css';

interface DetailModalProps {
  moduleId: string;
  detail: DetailConfig;
  parent: EntityData;
  parentTitle: string;
  refMaps: RefMaps;
  onClose: () => void;
}

/**
 * Detalle maestro-detalle reutilizable (renglones del reporte BC,
 * uniformes de un requerimiento, etc.). Mismo motor, cero duplicación.
 */
export function DetailModal({
  moduleId,
  detail,
  parent,
  parentTitle,
  refMaps,
  onClose,
}: DetailModalProps) {
  const { can } = useAuth();
  const filter = useMemo(
    () => ({ field: detail.parentKey, value: parent.id }),
    [detail.parentKey, parent.id],
  );
  const { rows, loading } = useCollection(detail.collection, filter);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EntityData | null>(null);
  const [deleting, setDeleting] = useState<EntityData | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionIds, setSessionIds] = useState<ReadonlySet<string>>(new Set());
  const [resetSignal, setResetSignal] = useState(0);

  const canCreate = can(moduleId, 'crear');
  const canEdit = can(moduleId, 'editar');
  const canDelete = can(moduleId, 'eliminar');

  const refLabel = (collection: string, id: string): string =>
    refMaps[collection]?.labels.get(id) ?? '—';

  const columns: TableColumn[] = useMemo(
    () =>
      detail.fields
        .filter((f) => f.table !== false)
        .map((field) => ({
          key: field.key,
          label: field.label,
          render: (row) => {
            const text = displayValue(field, (row as EntityData)[field.key] ?? null, refLabel);
            return field.key === 'status' && text !== '—' ? <Badge value={text} /> : text;
          },
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail.fields, refMaps],
  );

  const handleSubmit = async (values: Record<string, FieldValue>, keepOpen: boolean) => {
    setBusy(true);
    setFormError(null);
    try {
      const payload = { ...values, [detail.parentKey]: parent.id };
      if (editing) {
        await updateDocument(detail.collection, editing.id, payload);
        setSessionIds((prev) => new Set(prev).add(editing.id));
      } else {
        const newId = await createDocument(detail.collection, payload);
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
      await deleteDocument(detail.collection, deleting.id);
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };

  const handleExport = async () => {
    await exportToExcel(
      `${parentTitle} - ${detail.title}`,
      detail.fields.map((field) => ({
        header: field.label,
        values: rows.map((row) => displayValue(field, row[field.key] ?? null, refLabel)),
      })),
    );
  };

  return (
    <Modal open title={detail.title} onClose={onClose} size="lg">
      <div className="detail-toolbar">
        <button type="button" className="btn btn-outline" onClick={handleExport}>
          <FileSpreadsheet size={16} />
          Exportar Excel
        </button>
        {canCreate ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setFormError(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} />
            Agregar renglón
          </button>
        ) : null}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="Este registro todavía no tiene renglones"
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(row) => {
            setEditing(row);
            setFormError(null);
            setFormOpen(true);
          }}
          onDelete={(row) => setDeleting(row)}
        />
      )}

      <CrudForm
        open={formOpen}
        title={editing ? `Editar · ${detail.title}` : `Agregar · ${detail.title}`}
        fields={detail.fields}
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
        title="Eliminar renglón"
        message="¿Seguro que quieres eliminar este renglón del detalle?"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </Modal>
  );
}