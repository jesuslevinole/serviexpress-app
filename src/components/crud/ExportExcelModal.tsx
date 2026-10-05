import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { FieldConfig } from '../../types/models';
import './ExportExcelModal.css';

/** Qué registros exportar en módulos con Activo/Inactivo (Drivers, Trucks…). */
export type ActiveExportMode = 'active' | 'inactive' | 'all';

interface ExportExcelModalProps {
  title: string;
  fields: FieldConfig[];
  /** true = el módulo tiene Activo/Inactivo: se pregunta cuáles exportar. */
  hasActiveStatus?: boolean;
  onClose: () => void;
  onExport: (dateField: string, from: string, to: string, activeMode: ActiveExportMode) => Promise<void>;
}

const ACTIVE_OPTIONS: { value: ActiveExportMode; label: string }[] = [
  { value: 'active', label: 'Only ACTIVE' },
  { value: 'inactive', label: 'Only INACTIVE' },
  { value: 'all', label: 'All (active first, each one marked)' },
];

/**
 * Diálogo de exportación a Excel con su propio filtro por fechas,
 * independiente de la búsqueda y de los filtros de columnas de la tabla.
 */
export function ExportExcelModal({
  title,
  fields,
  hasActiveStatus = false,
  onClose,
  onExport,
}: ExportExcelModalProps) {
  const dateOptions = [
    { value: 'createdAt', label: 'Captured date (in the app)' },
    ...fields
      .filter((f) => f.type === 'date')
      .map((f) => ({ value: f.key, label: f.label })),
  ];

  const [dateField, setDateField] = useState('createdAt');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveExportMode | ''>('');

  const handleExport = async () => {
    if (hasActiveStatus && activeMode === '') return;
    setBusy(true);
    try {
      await onExport(dateField, from, to, activeMode === '' ? 'all' : activeMode);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Export Excel · ${title}`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleExport()}
            disabled={busy || (hasActiveStatus && activeMode === '')}
          >
            <FileSpreadsheet size={16} />
            {busy ? 'Generating…' : 'Export'}
          </button>
        </>
      }
    >
      <div className="expmodal">
        {hasActiveStatus ? (
          <div className="expmodal-field">
            <label>Which {title.toLowerCase()} do you want to export?</label>
            <div className="expmodal-choices" role="radiogroup">
              {ACTIVE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`expmodal-choice${activeMode === option.value ? ' is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="active-mode"
                    value={option.value}
                    checked={activeMode === option.value}
                    onChange={() => setActiveMode(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {activeMode === '' ? (
              <small className="expmodal-hint">Choose one option to enable Export.</small>
            ) : null}
          </div>
        ) : null}
        <div className="expmodal-field">
          <label>Filter by date of</label>
          <SearchableSelect value={dateField} options={dateOptions} onChange={setDateField} />
        </div>
        <div className="expmodal-field">
          <label>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="expmodal-field">
          <label>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="expmodal-hint">
          Leave the dates empty to export everything. This filter is independent from the search box
          and the table filters.
        </p>
      </div>
    </Modal>
  );
}
