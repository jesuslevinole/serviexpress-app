import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileUp, Pencil, Plus } from 'lucide-react';
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
import { CRUD_MODULES, moduleByCollection } from '../../config/modules';
import { TableLayoutModal } from './TableLayoutModal';
import { RelatedList } from './RelatedRecordsModal';
import { useUiConfig } from '../../hooks/useUiConfig';
import { PackagePlus } from 'lucide-react';
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
  /** Abre la captura del primer renglón de una vez (al venir de un alta nueva). */
  autoOpenForm?: boolean;
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
  autoOpenForm = false,
  onClose,
}: DetailModalProps) {
  const { can, firebaseUser, isAdmin } = useAuth();
  const { editMode } = useUiConfig();
  const [layoutOpen, setLayoutOpen] = useState(false);
  /** Puede reordenar y ocultar columnas: admin o permiso Customization. */
  const canCustomize = isAdmin || can('customize', 'editar');
  const filter = useMemo(
    () => ({ field: detail.parentKey, value: parent.id }),
    [detail.parentKey, parent.id],
  );
  const { rows, loading } = useCollection(detail.collection, filter);

  const [formOpen, setFormOpen] = useState(autoOpenForm);
  const [editing, setEditing] = useState<EntityData | null>(null);
  /**
   * Valores con los que arranca un alta nueva. Permite ofrecer botones que
   * abren el mismo formulario ya marcado (p. ej. "Add corrective" deja el
   * tipo listo, para no obligar a cambiarlo a mano cada vez).
   */
  const [preset, setPreset] = useState<Record<string, FieldValue> | undefined>(undefined);
  const [deleting, setDeleting] = useState<EntityData | null>(null);
  const [viewing, setViewing] = useState<EntityData | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryBusy, setEntryBusy] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  /** Valores del renglón en captura, para precargar el alta de existencia. */
  const [pendingValues, setPendingValues] = useState<Record<string, FieldValue>>({});

  /** Entradas al inventario (solo si el detalle descuenta existencias). */
  const stockEntries = useCollection(detail.stockControl?.entriesCollection ?? '');
  /** Módulo dueño de este detalle (para editar el layout de sus renglones). */
  const parentModule = CRUD_MODULES.find((module) => module.id === moduleId);
  const entryModule = detail.stockControl
    ? moduleByCollection(detail.stockControl.entriesCollection)
    : undefined;

  /** Existencia disponible del artículo elegido en el formulario. */
  const availableFor = (values: Record<string, FieldValue>): number | null => {
    const control = detail.stockControl;
    if (!control) return null;
    const chosen = control.matchKeys.every(
      (key) => typeof values[key] === 'string' && values[key] !== '',
    );
    if (!chosen) return null;
    const sameItem = (row: EntityData): boolean =>
      control.matchKeys.every((key) => String(row[key] ?? '') === String(values[key] ?? ''));
    const sum = (list: EntityData[]): number =>
      list.reduce((total, row) => {
        const quantity = row[control.quantityKey];
        return total + (typeof quantity === 'number' ? quantity : 0);
      }, 0);
    const totalIn = sum(stockEntries.rows.filter(sameItem));
    const totalOut = sum(rows.filter((row) => sameItem(row) && row.id !== editing?.id));
    return totalIn - totalOut;
  };

  /** Alta rápida de existencia sin salir del formulario. */
  const handleEntrySubmit = async (values: Record<string, FieldValue>) => {
    const control = detail.stockControl;
    if (!control) return;
    setEntryBusy(true);
    setEntryError(null);
    try {
      const payload = { ...values };
      if (entryModule?.autoUserField && firebaseUser) {
        payload[entryModule.autoUserField] = firebaseUser.uid;
      }
      await createDocument(control.entriesCollection, payload);
      setEntryOpen(false);
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : 'Could not save the entry');
    } finally {
      setEntryBusy(false);
    }
  };

  const detailFields = detail.fields;
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const canCreate = can(moduleId, 'crear');
  /**
   * Cargar existencia es una acción del módulo de inventario, no de este
   * formulario: se pide el permiso de crear DE ESE módulo. Sin esto, quien
   * podía pedir uniformes también podía inventar entradas de almacén.
   */
  const canAddStock =
    entryModule !== undefined && (isAdmin || can(entryModule.id, 'crear'));
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
      return available <= 0
        ? `There is no stock of this uniform and size (${totalIn} received, ${totalOut} already delivered). It has to be registered in Uniform inventory first.`
        : `Not enough stock: only ${available} available (${totalIn} received, ${totalOut} already delivered). Lower the quantity, or have more registered in Uniform inventory.`;
    }
    return null;
  };


  /** Escribe en el registro referenciado los datos marcados con syncToRefField. */
  const syncToReferences = async (values: Record<string, FieldValue>) => {
    for (const field of detail.fields) {
      const spec = field.syncToRefField;
      if (!spec) continue;
      if (spec.onlyWhen && !spec.onlyWhen({ id: '', ...values })) continue;
      const targetId = values[spec.field];
      const value = values[field.key];
      const sourceField = detail.fields.find((f) => f.key === spec.field);
      if (typeof targetId !== 'string' || targetId === '' || !sourceField?.refCollection) continue;
      if (value === null || value === undefined || value === '') continue;
      await setDocument(sourceField.refCollection, targetId, { [spec.targetField]: value }, true);
    }
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
        {editMode && canCustomize && parentModule ? (
          <button
            type="button"
            className="btn btn-primary"
            title="Rename, reorder and show/hide columns"
            onClick={() => setLayoutOpen(true)}
          >
            <Pencil size={15} />
            Edit table
          </button>
        ) : null}
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
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setPreset(undefined);
              setFormError(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} />
            {detail.addLabel ?? 'Add'}
          </button>
        ) : null}
        {canCreate
          ? (detail.extraAdd ?? []).map((extra) => (
              <button
                key={extra.label}
                type="button"
                className={`btn ${extra.tone === 'negative' ? 'btn-danger' : 'btn-outline'}`}
                onClick={() => {
                  setEditing(null);
                  setPreset(extra.preset);
                  setFormError(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={16} />
                {extra.label}
              </button>
            ))
          : null}
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

      {parentModule?.relatedViews?.map((view) => (
        <section key={view.id} className="detail-related">
          <h3>{view.title}</h3>
          <RelatedList view={view} recordId={parent.id} />
        </section>
      ))}

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
        ownerModuleId={moduleId}
        presetValues={editing === null ? preset : undefined}
        refMaps={refMaps}
        busy={busy}
        error={formError}
        resetSignal={resetSignal}
        renderBanner={
          detail.stockControl
            ? (values) => {
                const available = availableFor(values);
                return (
                  <div className={`dstock ${available !== null && available <= 0 ? 'is-empty' : ''}`}>
                    <span className="dstock-label">
                      {available === null
                        ? 'Pick a uniform and size to see the stock on hand'
                        : `Stock on hand: ${available}`}
                    </span>
                    {canAddStock ? (
                      <button
                        type="button"
                        className="btn btn-outline dstock-add"
                        onClick={() => {
                          setPendingValues(values);
                          setEntryError(null);
                          setEntryOpen(true);
                        }}
                      >
                        <PackagePlus size={16} />
                        Add stock
                      </button>
                    ) : null}
                  </div>
                );
              }
            : undefined
        }
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      {layoutOpen && parentModule ? (
        <TableLayoutModal base={parentModule} target="detail" onClose={() => setLayoutOpen(false)} />
      ) : null}

      {entryOpen && canAddStock && entryModule && detail.stockControl ? (
        <CrudForm
          open
          title={`Add stock · ${entryModule.title}`}
          fields={entryModule.fields}
          initial={
            {
              ...Object.fromEntries(
                detail.stockControl.matchKeys
                  .filter((key) => typeof pendingValues[key] === 'string' && pendingValues[key] !== '')
                  .map((key) => [key, pendingValues[key]]),
              ),
              id: '',
            } as EntityData
          }
          refMaps={refMaps}
          busy={entryBusy}
          error={entryError}
          resetSignal={0}
          onClose={() => setEntryOpen(false)}
          onSubmit={handleEntrySubmit}
        />
      ) : null}

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