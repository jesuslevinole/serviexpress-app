import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileUp, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCollection } from '../../hooks/useCollection';
import type { RefMaps } from '../../hooks/useRefMaps';
import {
  createDocument,
  deleteDocument,
  fetchCollection,
  setDocument,
  updateDocument,
} from '../../services/firestoreService';
import { downloadExcelTemplate, exportToExcel } from '../../services/excelExport';
import { buildTemplateFields } from './templateFields';
import { ImportCsvModal } from './ImportCsvModal';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DataTable, type TableColumn } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { CrudForm } from './CrudForm';
import { RecordDetailModal } from './RecordDetailModal';
import { displayValue, scalar } from './displayValue';
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
  const [importOpen, setImportOpen] = useState(false);

  const detailFields = detail.fields;
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
      detailFields
        .filter((f) => f.table !== false)
        .map((field) => ({
          key: field.key,
          label: field.label,
          render: (row) => {
            const text = displayValue(field, scalar((row as EntityData)[field.key]), refLabel);
            return (field.key === 'status' || field.badge === true) && text !== '—' ? (
              <Badge value={text} />
            ) : (
              text
            );
          },
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailFields, refMaps],
  );

  /**
   * Existencia disponible de un artículo: entradas menos salidas ya registradas
   * (sin contar el renglón que se está editando).
   */
  const checkStock = async (
    values: Record<string, FieldValue>,
    editingId: string | null,
  ): Promise<string | null> => {
    const control = detail.stockControl;
    if (!control) return null;
    const requested = Number(values[control.quantityKey] ?? 0);
    if (!Number.isFinite(requested) || requested <= 0) return null;

    const sameItem = (row: EntityData): boolean =>
      control.matchKeys.every((key) => String(row[key] ?? '') === String(values[key] ?? ''));
    const sumOf = (rows: EntityData[]): number =>
      rows.reduce((total, row) => {
        const quantity = row[control.quantityKey];
        return total + (typeof quantity === 'number' ? quantity : 0);
      }, 0);

    const [entries, exits] = await Promise.all([
      fetchCollection(control.entriesCollection),
      fetchCollection(detail.collection),
    ]);
    const totalIn = sumOf(entries.filter(sameItem));
    const totalOut = sumOf(exits.filter((row) => sameItem(row) && row.id !== editingId));
    const available = totalIn - totalOut;

    if (requested > available) {
      return `Not enough stock: ${available} available (${totalIn} in, ${totalOut} already delivered). Add an entry in Uniform inventory first.`;
    }
    return null;
  };

  const handleSubmit = async (values: Record<string, FieldValue>, keepOpen: boolean) => {
    setBusy(true);
    setFormError(null);
    try {
      const stockError = await checkStock(values, editing?.id ?? null);
      if (stockError) {
        setFormError(stockError);
        setBusy(false);
        return;
      }
      const payload = { ...values, [detail.parentKey]: parent.id };
      if (editing) {
        await updateDocument(detail.collection, editing.id, payload);
        if (detail.mirror) {
          await setDocument(
            detail.mirror.collection,
            `${detail.mirror.idPrefix}${editing.id}`,
            detail.mirror.build(parent.id, parent, payload),
          );
        }
      } else {
        const newId = await createDocument(detail.collection, payload);
        if (detail.mirror) {
          await setDocument(
            detail.mirror.collection,
            `${detail.mirror.idPrefix}${newId}`,
            detail.mirror.build(parent.id, parent, payload),
          );
        }
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
      if (detail.mirror) {
        await deleteDocument(detail.mirror.collection, `${detail.mirror.idPrefix}${deleting.id}`);
      }
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };

  /** Plantilla Excel de los renglones, con los desplegables del detalle. */
  const handleTemplate = async () => {
    await downloadExcelTemplate(
      `${parentTitle} - ${detail.title}`,
      buildTemplateFields(detailFields, refMaps),
    );
  };

  /** Importación de renglones: van al registro maestro abierto y se espejean. */
  const importRow = async (
    docId: string | null,
    values: Record<string, FieldValue>,
  ): Promise<void> => {
    const payload = { ...values, [detail.parentKey]: parent.id };
    let rowId = docId;
    if (docId) {
      await setDocument(detail.collection, docId, payload);
    } else {
      rowId = await createDocument(detail.collection, payload);
    }
    if (detail.mirror && rowId) {
      await setDocument(
        detail.mirror.collection,
        `${detail.mirror.idPrefix}${rowId}`,
        detail.mirror.build(parent.id, parent, payload),
      );
    }
  };

  const handleExport = async () => {
    await exportToExcel(
      `${parentTitle} - ${detail.title}`,
      detailFields.map((field) => ({
        header: field.label,
        values: rows.map((row) => displayValue(field, scalar(row[field.key]), refLabel)),
      })),
    );
  };

  return (
    <Modal open title={detail.title} onClose={onClose} size="lg">
      <div className="detail-toolbar">
        <button
          type="button"
          className="btn btn-outline"
          title="Download the Excel template for these rows"
          onClick={() => void handleTemplate()}
        >
          <FileDown size={16} />
          Template
        </button>
        {canCreate ? (
          <button
            type="button"
            className="btn btn-outline"
            title="Import rows from a CSV file into this record"
            onClick={() => setImportOpen(true)}
          >
            <FileUp size={16} />
            Import CSV
          </button>
        ) : null}
        <button type="button" className="btn btn-outline" onClick={handleExport}>
          <FileSpreadsheet size={16} />
          Export Excel
        </button>
        {canCreate ? (
          <button
            type="button"
            className="btn-add"
            title="Add row"
            aria-label="Add row"
            onClick={() => {
              setEditing(null);
              setFormError(null);
              setFormOpen(true);
            }}
          >
            <Plus size={22} strokeWidth={2.6} />
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

      {importOpen ? (
        <ImportCsvModal
          title={`${parentTitle} - ${detail.title}`}
          collection={detail.collection}
          fields={detailFields}
          refMaps={refMaps}
          currentUid={null}
          writeRow={importRow}
          onClose={() => setImportOpen(false)}
        />
      ) : null}

      {viewing ? (
        <RecordDetailModal
          title={detail.title}
          fields={detailFields}
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
        fields={detailFields}
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