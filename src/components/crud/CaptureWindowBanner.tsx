import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Clock, Lock, Settings2 } from 'lucide-react';
import {
  describeSchedule,
  formatDuration,
  formatTexas,
  resolveOccurrence,
} from '../../services/captureWindow';
import type { CaptureWindowInfo } from '../../hooks/useCaptureWindow';
import type { CaptureWindowConfig, EntityData } from '../../types/models';
import './CaptureWindow.css';

interface CaptureWindowBannerProps {
  spec: CaptureWindowConfig;
  info: CaptureWindowInfo;
  /** Nombre de un registro referenciado (camión, estación). */
  refLabel: (collection: string, id: string) => string;
  /** Texto que describe dónde y quién capturó un renglón ("BC 2026-08-28 · Station 2 · by Ana"). */
  describeParent: (parent: EntityData | null) => string;
  /** Estaciones del usuario: acotan la lista de "faltan por agregar". */
  scopeStations: string[];
  /** Nombre de la colección de estaciones, para etiquetar los grupos. */
  stationsCollection: string;
  /** Si se define, el admin puede abrir/ajustar la ventana desde aquí. */
  onConfigure?: () => void;
  /** Nombres de los BC asignados a una estación (para el grupo de faltantes). */
  stationBcs?: (stationId: string) => string[];
  /**
   * Camiones capturados esta ventana en reportes de la estación del usuario
   * pero que HOY no cuentan para ella (el catálogo los tiene en otra
   * estación, de baja o ya no existen): cierran la aritmética entre "el
   * reporte tiene 28" y "17 of 20 added".
   */
  extraTaken?: { id: string; label: string; reason: string }[];
}

type PendingKind = 'missing' | 'done' | 'blocked';

/**
 * Aviso de la ventana de captura: cuánto falta para que abra o cierre, y
 * qué camiones de la estación del usuario faltan por entrar en el reporte
 * de esta ventana. Un camión en taller o con correctivo pendiente no se
 * exige (tampoco se puede capturar), y se muestra aparte.
 */
export function CaptureWindowBanner({
  spec,
  info,
  refLabel,
  describeParent,
  scopeStations,
  stationsCollection,
  onConfigure,
  stationBcs,
  extraTaken = [],
}: CaptureWindowBannerProps) {
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // Conteo fino: solo este componente se vuelve a pintar cada segundo.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!info.window) return;
    const timer = globalThis.setInterval(() => setTick(Date.now()), 1000);
    return () => globalThis.clearInterval(timer);
  }, [info.window]);

  /** Estado y aparición (la abierta o la próxima) medidos cada segundo. */
  const { status, occurrence, previousEnd } = resolveOccurrence(info.window, tick);

  /** Camiones dentro del alcance del usuario (su estación/entidad), clasificados. */
  const items = useMemo(() => {
    const { once } = spec;
    return info.sourceRows
      .filter((row) => {
        // Manda SOLO la Current station del camión: en una estación conviven
        // camiones de varias entidades y el BC los cubre todos.
        const station = row[once.sourceStationKey];
        return (
          scopeStations.length === 0 ||
          (typeof station === 'string' && scopeStations.includes(station))
        );
      })
      .map((row) => {
        const station = row[once.sourceStationKey];
        const kind: PendingKind = info.taken.has(row.id)
          ? 'done'
          : info.blocked.has(row.id)
            ? 'blocked'
            : 'missing';
        return {
          row,
          kind,
          stationId: typeof station === 'string' ? station : '',
          label: refLabel(once.sourceCollection, row.id),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [spec, info.sourceRows, info.taken, info.blocked, scopeStations, refLabel]);

  const missing = items.filter((item) => item.kind === 'missing');
  const done = items.filter((item) => item.kind === 'done');
  const blocked = items.filter((item) => item.kind === 'blocked');
  const required = missing.length + done.length;

  /** Con varias estaciones a la vista (admin/oficina) se agrupa por estación. */
  const stationIds = [...new Set(items.map((item) => item.stationId))];
  const grouped = stationIds.length > 1;
  const groups = grouped
    ? stationIds
        .map((id) => ({
          id,
          label: id ? refLabel(stationsCollection, id) : 'No station',
          missing: missing.filter((item) => item.stationId === id),
        }))
        .filter((group) => group.missing.length > 0)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    : [];

  const startMs = occurrence ? new Date(occurrence.startAt).getTime() : 0;
  const endMs = occurrence ? new Date(occurrence.endAt).getTime() : 0;

  const configureButton = onConfigure ? (
    <button type="button" className="btn btn-outline cwin-config" onClick={onConfigure}>
      <Settings2 size={15} />
      {info.window ? 'Change window' : 'Open window'}
    </button>
  ) : null;

  if (info.loading) return null;

  if (!info.window || !occurrence || status === 'unset') {
    return (
      <section className="cwin is-unset">
        <div className="cwin-head">
          <Lock size={16} />
          <span className="cwin-text">
            <strong>{spec.label}:</strong> no weekly schedule is set. New records can only be added
            in the weekly window (day and Texas time) configured here.
          </span>
          {configureButton}
        </div>
      </section>
    );
  }

  return (
    <section className={`cwin is-${status}`}>
      <div className="cwin-head">
        {status === 'open' ? <Clock size={16} /> : <CalendarClock size={16} />}
        <span className="cwin-text">
          {status === 'open' ? (
            <>
              <strong>Time left to add your {spec.label.replace(' window', '')}:</strong>{' '}
              <span className="cwin-countdown">{formatDuration(endMs - tick)}</span>
              <span className="cwin-range">
                · closes {formatTexas(occurrence.endAt)} · {describeSchedule(info.window)}
              </span>
            </>
          ) : (
            <>
              <strong>
                {spec.label} is closed
                {previousEnd ? ` since ${formatTexas(previousEnd)}` : ''}. It opens again in
              </strong>{' '}
              <span className="cwin-countdown">{formatDuration(startMs - tick)}</span>
              <span className="cwin-range">
                · {formatTexas(occurrence.startAt)} · {describeSchedule(info.window)}
              </span>
            </>
          )}
        </span>
        {configureButton}
      </div>

      {status !== 'before' && required + blocked.length > 0 ? (
        <div className="cwin-progress">
          {missing.length > 0 ? <AlertTriangle size={15} /> : null}
          <span className="cwin-text">
            <strong>{done.length}</strong> of <strong>{required}</strong> {spec.once.sourceLabel}s
            {scopeStations.length > 0 ? ' at your station' : ''} added in this window
            {missing.length > 0 ? (
              <>
                {' '}
                · <strong>{missing.length}</strong> still missing
              </>
            ) : (
              ' · all done'
            )}
            {blocked.length > 0 ? (
              <>
                {' '}
                · {blocked.length} not required (in shop / corrective)
              </>
            ) : null}
            {extraTaken.length > 0 ? (
              <>
                {' '}
                · {extraTaken.length} added in your reports but not counted (moved / inactive)
              </>
            ) : null}
          </span>
          {missing.length > 0 || blocked.length > 0 || extraTaken.length > 0 ? (
            <button type="button" className="cwin-toggle" onClick={() => setOpen((v) => !v)}>
              {open ? 'Hide list' : 'See which ones'}
              {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <div className="cwin-lists">
          {missing.length > 0 ? (
            grouped ? (
              groups.map((group) => {
                const bcs = group.id && stationBcs ? stationBcs(group.id) : [];
                return (
                  <div key={group.id} className="cwin-group">
                    <span className="cwin-group-title">
                      {group.label} · {group.missing.length} missing
                    </span>
                    {stationBcs ? (
                      <span className="cwin-group-bcs">
                        BCs of this station:{' '}
                        {bcs.length > 0 ? <strong>{bcs.join(', ')}</strong> : 'none assigned'}
                      </span>
                    ) : null}
                    <ul className="cwin-list">
                      {group.missing.map((item) => (
                        <li key={item.row.id}>{item.label}</li>
                      ))}
                    </ul>
                  </div>
                );
              })
            ) : (
              <div className="cwin-group">
                <span className="cwin-group-title">Missing</span>
                <ul className="cwin-list">
                  {missing.map((item) => (
                    <li key={item.row.id}>{item.label}</li>
                  ))}
                </ul>
              </div>
            )
          ) : null}

          {blocked.length > 0 ? (
            <div className="cwin-group">
              <span className="cwin-group-title">Not available (can't be added)</span>
              <ul className="cwin-list is-blocked">
                {blocked.map((item) => (
                  <li key={item.row.id} title={info.blocked.get(item.row.id)}>
                    {item.label} — {info.blocked.get(item.row.id)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {extraTaken.length > 0 ? (
            <div className="cwin-group">
              <span className="cwin-group-title">
                Added in your station&apos;s reports but NOT counted for it
              </span>
              <ul className="cwin-list is-blocked">
                {extraTaken.map((item) => (
                  <li key={item.id} title={item.reason}>
                    {item.label} — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {done.length > 0 ? (
            <div className="cwin-group">
              <button type="button" className="cwin-toggle" onClick={() => setShowDone((v) => !v)}>
                {showDone ? 'Hide added' : `Show the ${done.length} already added`}
                {showDone ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {showDone ? (
                <ul className="cwin-list is-done">
                  {done.map((item) => (
                    <li key={item.row.id}>
                      {item.label} — {describeParent(info.taken.get(item.row.id)?.parent ?? null)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
