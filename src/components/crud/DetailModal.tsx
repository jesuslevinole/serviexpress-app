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
import { RecordDetailModal } from './RecordDetailModal';
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
  const [viewing, setViewing] = useState<EntityData | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
      } else {
        await createDocument(detail.collection, payload);
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
          Export Excel
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
            Add row
          </button>
        ) : null}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="This record has no rows yet"
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(row) => {
            setEditing(row);
            setFormError(null);
            setFormOpen(true);
          }}
          onDelete={(row) => setDeleting(row)}
          onRowClick={(row) => setViewing(row)}
        />
      )}

      {viewing ? (
        <RecordDetailModal
          title={detail.title}
          fields={detail.fields}
          record={viewing}
          refLabels={refLabel}
          onEdit={
            canEdit
              ? () => {
                  const row = viewing;
                  setViewing(null);
                  setEditing(row);
                  setFormError(null);
                  setFormOpen(true);
                }
              : undefined
          }
          onClose={() => setViewing(null)}
        />
      ) : null}

      <CrudForm
        open={formOpen}
        title={editing ? `Edit · ${detail.title}` : `Add · ${detail.title}`}
        fields={detail.fields}
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
        title="Delete row"
        message="Are you sure you want to delete this detail row?"
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </Modal>
  );
}
