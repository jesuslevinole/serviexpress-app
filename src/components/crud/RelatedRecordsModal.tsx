import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { DataTable, type TableColumn } from '../ui/DataTable';
import { useCollection } from '../../hooks/useCollection';
import { useRefMaps } from '../../hooks/useRefMaps';
import { displayCell } from './displayValue';
import type { EntityData, RelatedView } from '../../types/models';
import './RelatedRecordsModal.css';

interface RelatedRecordsModalProps {
  title: string;
  /** Registro maestro (camión, driver, etc.). */
  record: EntityData;
  /** Etiqueta legible del registro (unidad, placa…). */
  recordLabel: string;
  views: RelatedView[];
  onClose: () => void;
}

/** Una pestaña: se suscribe a su colección y muestra los registros ligados. */
function RelatedList({ view, recordId }: { view: RelatedView; recordId: string }) {
  const { rows, loading, error } = useCollection(view.collection);
  const refMaps = useRefMaps(view.fields);

  const refLabel = (collection: string, id: string): string =>
    refMaps[collection]?.labels.get(id) ?? '—';

  const filtered = useMemo(
    () =>
      rows
        .filter((row) => row[view.foreignKey] === recordId)
        .filter((row) => !view.filter || row[view.filter.field] === view.filter.value)
        .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
    [rows, recordId, view],
  );

  const columns: TableColumn[] = view.fields.map((field) => ({
    key: field.key,
    label: field.label,
    render: (row) => {
      const text = displayCell(field, row as EntityData, refLabel);
      return field.badge === true && text !== '—' ? <Badge value={text} /> : text;
    },
  }));

  if (loading) return <Spinner />;
  if (error) return <p className="related-error">Loading error: {error}</p>;

  return (
    <>
      <p className="related-count">
        {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
      </p>
      <DataTable
        columns={columns}
        rows={filtered}
        emptyMessage={view.emptyMessage ?? 'No records yet'}
        canEdit={false}
        canDelete={false}
      />
    </>
  );
}

/**
 * Visor de registros relacionados: historial de mantenimiento correctivo,
 * movimientos de estación/entidad y cualquier otra lista ligada al registro.
 */
export function RelatedRecordsModal({
  title,
  record,
  recordLabel,
  views,
  onClose,
}: RelatedRecordsModalProps) {
  const [activeId, setActiveId] = useState(views[0]?.id ?? '');
  const active = views.find((v) => v.id === activeId) ?? views[0];

  return (
    <Modal open title={`${title} · ${recordLabel}`} onClose={onClose} size="lg">
      {views.length > 1 ? (
        <div className="related-tabs">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              className={`related-tab ${view.id === active?.id ? 'is-active' : ''}`}
              onClick={() => setActiveId(view.id)}
            >
              {view.title}
            </button>
          ))}
        </div>
      ) : null}
      {active ? <RelatedList view={active} recordId={record.id} /> : null}
    </Modal>
  );
}