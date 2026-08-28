import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  APP_TIME_ZONE,
  formatTexas,
  isoToTexasLocal,
  texasLocalToIso,
  type CaptureWindow,
} from '../../services/captureWindow';
import './CaptureWindow.css';

interface CaptureWindowModalProps {
  label: string;
  window: CaptureWindow | null;
  onSave: (startLocal: string, endLocal: string) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

/** Inicio propuesto: hoy a las 00:00 de Texas; cierre: hoy a las 23:59. */
function defaultRange(): { start: string; end: string } {
  const today = isoToTexasLocal(new Date().toISOString()).slice(0, 10);
  return { start: `${today}T00:00`, end: `${today}T23:59` };
}

/**
 * Configuración de la ventana de captura (solo administradores). Las horas
 * se capturan y se guardan como hora de Texas: el reloj de la esquina
 * muestra la hora de Texas en este momento para que el admin no tenga que
 * convertir nada aunque esté en otra zona.
 */
export function CaptureWindowModal({ label, window, onSave, onClear, onClose }: CaptureWindowModalProps) {
  const initial = window ? { start: window.startLocal, end: window.endLocal } : defaultRange();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  const startIso = texasLocalToIso(start);
  const endIso = texasLocalToIso(end);
  const rangeOk = startIso !== null && endIso !== null && new Date(endIso) > new Date(startIso);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(start, end);
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
            disabled={busy || !rangeOk}
          >
            {busy ? 'Saving…' : window ? 'Update window' : 'Open window'}
          </button>
        </>
      }
    >
      <div className="cwin-modal">
        <p className="cwin-modal-help">
          Between these two moments everyone can add records; outside of them nobody can
          (administrators are not restricted). Times are <strong>Texas time (Central)</strong> for
          all users, whatever their own time zone.
        </p>
        <div className="cwin-modal-now">
          <span>Texas time now</span>
          <strong>{formatTexas(now, true)}</strong>
          <small>{APP_TIME_ZONE}</small>
        </div>
        <div className="cwin-modal-grid">
          <label className="cwin-modal-field">
            <span>Opens (Texas time)</span>
            <input
              className="field-input"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="cwin-modal-field">
            <span>Closes (Texas time)</span>
            <input
              className="field-input"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <p className={`cwin-modal-preview ${rangeOk ? '' : 'is-invalid'}`}>
          {rangeOk && startIso && endIso
            ? `The window will run from ${formatTexas(startIso)} to ${formatTexas(endIso)}.`
            : 'Choose a start and an end; the end must be after the start.'}
        </p>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Remove window"
        message="Without a window nobody (except administrators) will be able to add records. Remove it?"
        busy={busy}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void handleClear()}
      />
    </Modal>
  );
}
