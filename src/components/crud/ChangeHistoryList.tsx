import { useEffect, useState } from 'react';
import { fetchRecordHistory, type ChangeEntry } from '../../services/changeLog';
import { formatUsDate } from './displayValue';
import './ChangeHistoryList.css';

interface ChangeHistoryListProps {
  recordId: string;
  /**
   * Si se indica, solo se muestran entradas que tocaron ALGUNO de estos
   * campos (la pestaña "Station & Entity changes" del camión), y de cada
   * entrada solo esos cambios.
   */
  fieldKeys?: string[];
}

/** "2026-08-31T20:12:33.000Z" -> "08/31/2026, 03:12 PM CT" (hora de Texas). */
function stamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatUsDate(iso);
  return date.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Bitácora de UN registro: cada alta, edición (campo por campo, valor
 * anterior -> nuevo) y borrado, con quién lo hizo y cuándo (hora de Texas).
 * Los valores vienen resueltos a texto desde el momento del cambio.
 */
export function ChangeHistoryList({ recordId, fieldKeys }: ChangeHistoryListProps) {
  const [entries, setEntries] = useState<ChangeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    fetchRecordHistory(recordId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load history');
      });
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  if (error) return <p className="chlog-empty">History unavailable: {error}</p>;
  if (entries === null) return <p className="chlog-empty">Loading history…</p>;

  const filtered = entries
    .map((entry) => ({
      ...entry,
      changes: fieldKeys
        ? entry.changes.filter((change) => fieldKeys.includes(change.key))
        : entry.changes,
    }))
    .filter((entry) => (fieldKeys ? entry.changes.length > 0 : true));

  if (filtered.length === 0) {
    return (
      <p className="chlog-empty">
        {fieldKeys
          ? 'No station or entity changes recorded yet (the log starts with this version).'
          : 'No changes recorded yet (the log starts with this version).'}
      </p>
    );
  }

  return (
    <ul className="chlog">
      {filtered.map((entry) => (
        <li key={entry.id} className={`chlog-entry is-${entry.action}`}>
          <div className="chlog-head">
            <span className="chlog-action">
              {entry.action === 'create'
                ? 'Created'
                : entry.action === 'delete'
                  ? 'Deleted'
                  : 'Edited'}
            </span>
            <span className="chlog-by">by {entry.byName}</span>
            <span className="chlog-when">
              {entry.createdAt !== null ? `${stamp(entry.createdAt)} CT` : '—'}
            </span>
          </div>
          {entry.changes.length > 0 ? (
            <ul className="chlog-changes">
              {entry.changes.map((change) => (
                <li key={change.key}>
                  <strong>{change.label}:</strong> {change.from} <span aria-hidden>→</span>{' '}
                  {change.to}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
