
import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { FieldConfig } from '../../types/models';
import './ExportExcelModal.css';

interface ExportExcelModalProps {
  title: string;
  fields: FieldConfig[];
  onClose: () => void;
  onExport: (dateField: string, from: string, to: string) => Promise<void>;
}

/**
 * Diálogo de exportación a Excel con su propio filtro por fechas,
 * independiente de la búsqueda y de los filtros de columnas de la tabla.
 */
export function ExportExcelModal({ title, fields, onClose, onExport }: ExportExcelModalProps) {
  const dateOptions = [
    { value: 'createdAt', label: 'Fecha de captura en el app' },
    ...fields
      .filter((f) => f.type === 'date')
      .map((f) => ({ value: f.key, label: f.label })),
  ];

  const [dateField, setDateField] = useState('createdAt');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      await onExport(dateField, from, to);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Exportar Excel · ${title}`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleExport()}
            disabled={busy}
          >
            <FileSpreadsheet size={16} />
            {busy ? 'Generando…' : 'Exportar'}
          </button>
        </>
      }
    >
      <div className="expmodal">
        <div className="expmodal-field">
          <label>Filtrar por fecha de</label>
          <SearchableSelect value={dateField} options={dateOptions} onChange={setDateField} />
        </div>
        <div className="expmodal-field">
          <label>Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="expmodal-field">
          <label>Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="expmodal-hint">
          Deja las fechas vacías para exportar todo. Este filtro es independiente de la búsqueda y
          de los filtros de la tabla.
        </p>
      </div>
    </Modal>
  );
}