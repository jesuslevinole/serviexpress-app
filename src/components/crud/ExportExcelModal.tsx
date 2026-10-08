import { useEffect, useMemo, useState } from 'react';
import { Check, Columns3, FileSpreadsheet } from 'lucide-react';
import { loadExcludedColumns, saveExcludedColumns } from '../../services/exportColumns';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { FieldConfig } from '../../types/models';
import './ExportExcelModal.css';

/** Qué registros exportar en módulos con Activo/Inactivo (Drivers, Trucks…). */
export type ActiveExportMode = 'active' | 'inactive' | 'all';

/** Una columna que puede salir en el Excel. */
export interface ExportColumnOption {
  key: string;
  label: string;
}

interface ExportExcelModalProps {
  title: string;
  fields: FieldConfig[];
  /** Columnas disponibles, en el orden en que salen en el archivo. */
  columns: ExportColumnOption[];
  /** Para guardar la selección: id del módulo y usuario que exporta. */
  moduleId: string;
  userId: string;
  /** true = el módulo tiene Activo/Inactivo: se pregunta cuáles exportar. */
  hasActiveStatus?: boolean;
  /** false = sin el filtro por fechas (se exporta todo lo elegido). */
  showDateFilter?: boolean;
  onClose: () => void;
  onExport: (
    dateField: string,
    from: string,
    to: string,
    activeMode: ActiveExportMode,
    columnKeys: string[],
  ) => Promise<void>;
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
  columns,
  moduleId,
  userId,
  hasActiveStatus = false,
  showDateFilter = true,
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

  /** Columnas desmarcadas (se guardan éstas: lo nuevo sale marcado). */
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loadingCols, setLoadingCols] = useState(true);
  const [hadSaved, setHadSaved] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadExcludedColumns(userId, moduleId).then((list) => {
      if (cancelled) return;
      setExcluded(new Set(list ?? []));
      setHadSaved(list !== null);
      setLoadingCols(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, moduleId]);

  const selectedKeys = useMemo(
    () => columns.filter((c) => !excluded.has(c.key)).map((c) => c.key),
    [columns, excluded],
  );

  const toggle = (key: string) => {
    setSavedNote(null);
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setAll = (on: boolean) => {
    setSavedNote(null);
    setExcluded(on ? new Set() : new Set(columns.map((c) => c.key)));
  };

  /** Solo se guardan claves que existen hoy (las viejas se limpian solas). */
  const persist = async () => {
    const known = new Set(columns.map((c) => c.key));
    const ok = await saveExcludedColumns(
      userId,
      moduleId,
      [...excluded].filter((key) => known.has(key)),
    );
    setHadSaved(true);
    setSavedNote(
      ok
        ? 'Selection saved — it will be used every time you export.'
        : 'Selection saved on this device only (it could not be saved to your account).',
    );
  };

  const handleExport = async () => {
    if (hasActiveStatus && activeMode === '') return;
    if (selectedKeys.length === 0) return;
    setBusy(true);
    try {
      // Exportar también guarda la selección para la próxima vez.
      await persist();
      await onExport(dateField, from, to, activeMode === '' ? 'all' : activeMode, selectedKeys);
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
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleExport()}
            disabled={
              busy || loadingCols || selectedKeys.length === 0 || (hasActiveStatus && activeMode === '')
            }
          >
            <FileSpreadsheet size={16} />
            {busy ? 'Generating…' : 'Export'}
          </button>
        </>
      }
    >
      <div className="expmodal">
        <div className="expmodal-field">
          <div className="expmodal-cols-head">
            <label>
              <Columns3 size={14} /> Columns in the Excel ({selectedKeys.length} of {columns.length})
            </label>
            <span className="expmodal-cols-actions">
              <button type="button" className="expmodal-link" onClick={() => setAll(true)}>
                All
              </button>
              <button type="button" className="expmodal-link" onClick={() => setAll(false)}>
                None
              </button>
            </span>
          </div>
          {loadingCols ? (
            <small className="expmodal-hint">Loading your saved selection…</small>
          ) : (
            <div className="expmodal-cols">
              {columns.map((column) => {
                const on = !excluded.has(column.key);
                return (
                  <label key={column.key} className={`expmodal-col${on ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(column.key)} />
                    {column.label}
                  </label>
                );
              })}
            </div>
          )}
          <div className="expmodal-cols-foot">
            <button
              type="button"
              className="btn btn-outline"
              disabled={loadingCols || busy}
              onClick={() => void persist()}
            >
              <Check size={15} />
              Save selection
            </button>
            <small>
              {savedNote ??
                (hadSaved
                  ? 'Using your saved selection. Exporting also saves any change.'
                  : 'Choose the columns once; the selection is saved for next time.')}
            </small>
          </div>
          {selectedKeys.length === 0 && !loadingCols ? (
            <small className="expmodal-hint">Select at least one column to enable Export.</small>
          ) : null}
        </div>
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
        {showDateFilter ? (
          <>
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
          </>
        ) : null}
      </div>
    </Modal>
  );
}
