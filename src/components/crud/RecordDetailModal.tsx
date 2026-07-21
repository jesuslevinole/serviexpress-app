import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { displayValue } from './displayValue';
import type { EntityData, FieldConfig } from '../../types/models';
import './RecordDetailModal.css';

interface RecordDetailModalProps {
  title: string;
  fields: FieldConfig[];
  record: EntityData;
  refLabels: (collection: string, id: string) => string;
  /** Contenido extra opcional (p. ej. desglose de permisos en Roles). */
  extra?: ReactNode;
  /** Si se define, muestra el botón Editar. */
  onEdit?: () => void;
  onClose: () => void;
}

const STATUS_KEYS = new Set(['status', 'dlStatus', 'dotStatus', 'qcStatus']);

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Visor de detalle de un registro: toda la información guardada,
 * resuelta a nombres, en un modal de solo lectura. Se abre con clic
 * en la fila de cualquier tabla del app.
 */
export function RecordDetailModal({
  title,
  fields,
  record,
  refLabels,
  extra,
  onEdit,
  onClose,
}: RecordDetailModalProps) {
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : '';

  return (
    <Modal
      open
      title={`Detail · ${title}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {createdAt ? (
            <span className="rdetail-meta">Captured: {formatDateTime(createdAt)}</span>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          {onEdit ? (
            <button type="button" className="btn btn-primary" onClick={onEdit}>
              <Pencil size={15} />
              Edit
            </button>
          ) : null}
        </>
      }
    >
      <div className="rdetail-grid">
        {fields.map((field) => {
          const text = displayValue(field, record[field.key] ?? null, refLabels);
          const isStatus = STATUS_KEYS.has(field.key) && text !== '—';
          return (
            <div
              key={field.key}
              className={`rdetail-item ${field.type === 'textarea' ? 'is-full' : ''}`}
            >
              <span className="rdetail-label">{field.label}</span>
              <span className={`rdetail-value ${text === '—' ? 'is-empty' : ''}`}>
                {isStatus ? <Badge value={text} /> : text}
              </span>
            </div>
          );
        })}
      </div>
      {extra ? <div className="rdetail-extra">{extra}</div> : null}
    </Modal>
  );
}
