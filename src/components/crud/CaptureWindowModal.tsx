import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SearchableSelect } from '../ui/SearchableSelect';
import {
  APP_TIME_ZONE,
  DAY_NAMES,
  describeSchedule,
  formatDuration,
  formatTexas,
  resolveOccurrence,
  type CaptureWindow,
} from '../../services/captureWindow';
import './CaptureWindow.css';

interface CaptureWindowModalProps {
  label: string;
  window: CaptureWindow | null;
  onSave: (window: Omit<CaptureWindow, 'updatedBy'>) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

const DAY_OPTIONS = DAY_NAMES.map((name, index) => ({ value: String(index), label: name }));

/**
 * Configuración de la ventana de captura semanal. Se elige el día de la
 * semana y la hora (de Texas) en que abre y en que cierra, y se repite cada
 * semana: p. ej. lunes 8:00 AM -> domingo 11:59 PM. El reloj muestra la hora
 * de Texas en este momento para que quien configura no convierta nada.
 */
export function CaptureWindowModal({ label, window, onSave, onClear, onClose }: CaptureWindowModalProps) {
  // Por omisión, el horario del ejemplo del cliente: lunes 08:00 -> domingo 23:59.
  const [startDay, setStartDay] = useState(String(window?.startDay ?? 1));
  const [startTime, setStartTime] = useState(window?.startTime ?? '08:00');
  const [endDay, setEndDay] = useState(String(window?.endDay ?? 0));
  const [endTime, setEndTime] = useState(window?.endTime ?? '23:59');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  const draft: Omit<CaptureWindow, 'updatedBy'> = useMemo(
    () => ({
      startDay: Number(startDay),
      startTime,
      endDay: Number(endDay),
      endTime,
    }),
    [startDay, startTime, endDay, endTime],
  );

  /** Cómo quedaría la ventana con lo capturado, medida en este instante. */
  const preview = useMemo(
    () => resolveOccurrence({ ...draft, updatedBy: null }, now),
    [draft, now],
  );

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The window could not be saved');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    setError(null);
    try {
      await onClear();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The window could not be removed');
    } finally {
      setBusy(false);
      setConfirmClear(false);
    }
  };

  return (
    <Modal
      open
      title={label}
      onClose={onClose}
      size="md"
      footer={
        <>
          {error ? <span className="crudform-error">{error}</span> : null}
          {window ? (
            <button
              type="button"
              className="btn btn-danger cwin-modal-clear"
              onClick={() => setConfirmClear(true)}
              disabled={busy}
            >
              Remove window
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={busy || preview.status === 'unset'}
          >
            {busy ? 'Saving…' : window ? 'Update window' : 'Open window'}
          </button>
        </>
      }
    >
      <div className="cwin-modal">
        <p className="cwin-modal-help">
          Pick the day of the week and the time the window opens and closes;{' '}
          <strong>it repeats every week</strong>. Between those two moments everyone can add
          records; outside of them only the roles with "Add outside window" can. Times are{' '}
          <strong>Texas time (Central)</strong> for all users, whatever their own time zone.
        </p>
        <div className="cwin-modal-now">
          <span>Texas time now</span>
          <strong>{formatTexas(new Date(now).toISOString(), true)}</strong>
          <small>{APP_TIME_ZONE}</small>
        </div>
        <div className="cwin-modal-grid">
          <div className="cwin-modal-field">
            <span>Opens on (every week)</span>
            <SearchableSelect value={startDay} options={DAY_OPTIONS} onChange={setStartDay} />
          </div>
          <label className="cwin-modal-field">
            <span>At (Texas time)</span>
            <input
              className="field-input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <div className="cwin-modal-field">
            <span>Closes on</span>
            <SearchableSelect value={endDay} options={DAY_OPTIONS} onChange={setEndDay} />
          </div>
          <label className="cwin-modal-field">
            <span>At (Texas time)</span>
            <input
              className="field-input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>
        <p className={`cwin-modal-preview ${preview.status === 'unset' ? 'is-invalid' : ''}`}>
          {preview.status === 'unset' || !preview.occurrence
            ? 'Choose the opening and closing time.'
            : preview.status === 'open'
              ? `The window will repeat ${describeSchedule({ ...draft, updatedBy: null })}. Right now it would be OPEN, closing ${formatTexas(preview.occurrence.endAt)} (in ${formatDuration(new Date(preview.occurrence.endAt).getTime() - now, false)}).`
              : `The window will repeat ${describeSchedule({ ...draft, updatedBy: null })}. Right now it would be CLOSED, opening ${formatTexas(preview.occurrence.startAt)} (in ${formatDuration(new Date(preview.occurrence.startAt).getTime() - now, false)}).`}
        </p>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Remove window"
        message="Without a window, only the roles with the 'Add outside window' permission (and administrators) will be able to add records. Remove it?"
        busy={busy}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void handleClear()}
      />
    </Modal>
  );
}
