import { useMemo } from 'react';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { displayValue } from './displayValue';
import type { EntityData, FieldConfig } from '../../types/models';
import './SaveSummary.css';

interface SaveSummaryProps {
  /** Campos del módulo (se usan para elegir qué mostrar de cada registro). */
  fields: FieldConfig[];
  /** Registros de la colección en tiempo real (ya vienen ordenados por fecha desc). */
  rows: EntityData[];
  /** Resolución id -> nombre para refs. */
  refLabels: (collection: string, id: string) => string;
  /** Ids guardados durante esta sesión de captura (se resaltan como nuevos). */
  sessionIds: ReadonlySet<string>;
  /** Máximo de registros a listar. */
  limit?: number;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Sumario lateral de captura: muestra en tiempo real los registros
 * que se van guardando, con los más recientes arriba y los de esta
 * sesión resaltados. Reutilizado por TODOS los formularios del app.
 */
export function SaveSummary({
  fields,
  rows,
  refLabels,
  sessionIds,
  limit = 12,
}: SaveSummaryProps) {
  const visibleFields = useMemo(() => {
    const tableFields = fields.filter((f) => f.table !== false);
    const source = tableFields.length > 0 ? tableFields : fields;
    return { primary: source[0], secondary: source.slice(1, 4) };
  }, [fields]);

  const items = useMemo(() => rows.slice(0, limit), [rows, limit]);

  return (
    <aside className="ssum" aria-label="Sumario de registros guardados">
      <div className="ssum-header">
        <ListChecks size={16} />
        <span>Sumario</span>
        <span className="ssum-count">{rows.length}</span>
      </div>
      {sessionIds.size > 0 ? (
        <p className="ssum-session">
          <CheckCircle2 size={13} />
          {sessionIds.size === 1
            ? '1 guardado en esta sesión'
            : `${sessionIds.size} guardados en esta sesión`}
        </p>
      ) : null}
      <ul className="ssum-list">
        {items.length === 0 ? <li className="ssum-empty">Aún no hay registros</li> : null}
        {items.map((row) => {
          const isNew = sessionIds.has(row.id);
          const primary = visibleFields.primary
            ? displayValue(visibleFields.primary, row[visibleFields.primary.key] ?? null, refLabels)
            : '—';
          const secondary = visibleFields.secondary
            .map((f) => displayValue(f, row[f.key] ?? null, refLabels))
            .filter((v) => v !== '—')
            .join(' · ');
          const savedAt = typeof row.createdAt === 'string' ? formatTime(row.createdAt) : '';
          return (
            <li key={row.id} className={`ssum-item ${isNew ? 'is-new' : ''}`}>
              <div className="ssum-item-main">
                <strong>{primary}</strong>
                {secondary ? <span>{secondary}</span> : null}
              </div>
              <div className="ssum-item-meta">
                {isNew ? <em>Nuevo</em> : null}
                {savedAt ? <time>{savedAt}</time> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}