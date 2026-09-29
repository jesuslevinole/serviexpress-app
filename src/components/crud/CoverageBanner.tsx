import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useCollection } from '../../hooks/useCollection';
import { NO_CAPTURE_MODULE, useCaptureWindow } from '../../hooks/useCaptureWindow';
import { CRUD_MODULES } from '../../config/modules';
import { texasDateOf } from '../../services/captureWindow';
import { formatUsDate } from './displayValue';
import type { CoverageConfig, EntityData } from '../../types/models';
import { ACTIVE_FLAG_BY_COLLECTION, isActiveRecord } from '../../services/activeStatus';
import './CoverageBanner.css';

interface CoverageBannerProps {
  config: CoverageConfig;
  /** Filas del módulo que se está viendo, ya filtradas por alcance. */
  rows: EntityData[];
  /** true si estas filas SON la lista de referencia (Trucks), false si son las que cubren (Fleet). */
  rowsAreSource: boolean;
  /** Estaciones del usuario acotado (BC): la cobertura se mide sobre SU estación. */
  scopeStations?: string[];
  /** Uid efectivo, para el conteo "agregados por ti". */
  ownUid?: string | null;
  /** Clic en un registro de la lista de faltantes: abre su detalle. */
  onSourceClick?: (row: EntityData) => void;
}

const NO_ROWS: EntityData[] = [];

/** Texto que identifica un registro de la lista de referencia. */
function labelOf(row: EntityData, keys: string[]): string {
  const parts = keys
    .map((key) => row[key])
    .filter((value) => typeof value === 'string' && value !== '');
  return parts.length > 0 ? parts.join(' · ') : row.id;
}

/** Número de camión (clicable si hay handler). */
function SourceChip({
  row,
  keys,
  onClick,
}: {
  row: EntityData;
  keys: string[];
  onClick?: (row: EntityData) => void;
}) {
  if (!onClick) return <>{labelOf(row, keys)}</>;
  return (
    <button
      type="button"
      className="coverage-chip-btn"
      title="Open this truck's detail"
      onClick={() => onClick(row)}
    >
      {labelOf(row, keys)}
    </button>
  );
}

/**
 * Aviso de cobertura: de los N registros de una lista (camiones), cuántos
 * están dados de alta en otra (Fleet) y cuántos no, con la lista de los que
 * faltan. Aparece igual en los dos módulos para que ambos vean lo mismo.
 */
export function CoverageBanner({
  config,
  rows,
  rowsAreSource,
  scopeStations = [],
  ownUid = null,
  onSourceClick,
}: CoverageBannerProps) {
  const [open, setOpen] = useState(false);

  /**
   * Cobertura contra la SEMANA de un módulo con ventana (Fleet Report): se
   * usa el mismo cálculo que su aviso (capturados esta semana, en taller /
   * correctivo). Al cambiar la semana o el horario se recalcula solo.
   */
  const windowModule = useMemo(
    () =>
      config.targetWindowModuleId
        ? (CRUD_MODULES.find((m) => m.id === config.targetWindowModuleId && m.captureWindow) ?? null)
        : null,
    [config.targetWindowModuleId],
  );
  const windowed = windowModule !== null && rowsAreSource;
  const windowInfo = useCaptureWindow(windowed ? windowModule : NO_CAPTURE_MODULE, NO_ROWS);

  // Se lee la colección que no viene por props; la otra ya está en pantalla.
  // (Con semana, lo capturado lo trae el cálculo de la ventana.)
  const fetched = useCollection(
    windowed ? '' : rowsAreSource ? config.targetCollection : config.sourceCollection,
  );

  const sourceAll = rowsAreSource ? rows : fetched.rows;
  const target = rowsAreSource ? fetched.rows : rows;

  /**
   * Para un BC, la lista de referencia son SOLO los camiones ACTIVOS cuya
   * Current station es la suya: su cobertura es su estación, no la flota
   * completa.
   */
  const source = useMemo(() => {
    const activeFlag = ACTIVE_FLAG_BY_COLLECTION[config.sourceCollection];
    let filtered = activeFlag
      ? sourceAll.filter((row) => isActiveRecord(row, activeFlag))
      : sourceAll;
    if (scopeStations.length > 0 && config.sourceStationKey) {
      const key = config.sourceStationKey;
      filtered = filtered.filter((row) => {
        const st = row[key];
        return typeof st === 'string' && scopeStations.includes(st);
      });
    }
    return filtered;
  }, [sourceAll, scopeStations, config.sourceCollection, config.sourceStationKey]);

  /** Con semana: capturados esta semana / no exigidos (taller, correctivo). */
  const weekly = useMemo(() => {
    if (!windowed) return null;
    const covered = source.filter((row) => windowInfo.taken.has(row.id));
    const notRequired = source.filter(
      (row) => !windowInfo.taken.has(row.id) && windowInfo.blocked.has(row.id),
    );
    const pending = source.filter(
      (row) => !windowInfo.taken.has(row.id) && !windowInfo.blocked.has(row.id),
    );
    const mine =
      ownUid !== null && config.targetOwnerKey !== undefined
        ? covered.filter(
            (row) => windowInfo.taken.get(row.id)?.parent?.[config.targetOwnerKey!] === ownUid,
          ).length
        : null;
    return { covered, notRequired, pending, mine };
  }, [windowed, source, windowInfo.taken, windowInfo.blocked, ownUid, config.targetOwnerKey]);

  const missing = useMemo(() => {
    if (weekly) return weekly.pending;
    const covered = new Set(
      target
        .map((row) => row[config.targetKey])
        .filter((value): value is string => typeof value === 'string' && value !== ''),
    );
    return source.filter((row) => !covered.has(row.id));
  }, [weekly, source, target, config.targetKey]);

  if (windowed ? windowInfo.loading : fetched.loading) return null;
  if (source.length === 0) return null;

  if (weekly) {
    const occ = windowInfo.occurrence;
    const range = occ
      ? `${formatUsDate(texasDateOf(occ.startAt))} → ${formatUsDate(texasDateOf(occ.endAt))}`
      : null;
    const scopedWeek = scopeStations.length > 0;
    return (
      <section className={`coverage ${weekly.pending.length > 0 ? 'has-missing' : ''}`}>
        <div className="coverage-head">
          {weekly.pending.length > 0 ? <AlertTriangle size={16} /> : null}
          <span className="coverage-text">
            {range === null ? (
              <>
                No Fleet Report week is set right now — open the window in Fleet Report to
                measure coverage.
              </>
            ) : (
              <>
                Of <strong>{source.length}</strong> {config.sourceLabel}
                {scopedWeek ? ' at your station' : ''},{' '}
                <strong>{weekly.covered.length}</strong> {config.coveredLabel} ({range}
                {windowInfo.status === 'before' ? ', opens soon' : ''})
                {weekly.mine !== null ? (
                  <>
                    {' '}
                    (<strong>{weekly.mine}</strong> added by you)
                  </>
                ) : null}{' '}
                and <strong>{weekly.pending.length}</strong> {config.missingLabel}
                {weekly.notRequired.length > 0 ? (
                  <>
                    {' '}
                    · <strong>{weekly.notRequired.length}</strong> not required (in shop /
                    corrective)
                  </>
                ) : null}
                .
              </>
            )}
          </span>
          {weekly.pending.length + weekly.notRequired.length > 0 && range !== null ? (
            <button type="button" className="coverage-toggle" onClick={() => setOpen((v) => !v)}>
              {open ? 'Hide list' : 'See which ones'}
              {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          ) : null}
        </div>
        {open && range !== null ? (
          <>
            {weekly.pending.length > 0 ? (
              <>
                <span className="coverage-group-title">Missing this week</span>
                <ul className="coverage-list">
                  {weekly.pending.map((row) => (
                    <li key={row.id}>
                      <SourceChip row={row} keys={config.sourceLabelKeys} onClick={onSourceClick} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {weekly.notRequired.length > 0 ? (
              <>
                <span className="coverage-group-title">Not required (in shop / corrective)</span>
                <ul className="coverage-list is-muted">
                  {weekly.notRequired.map((row) => (
                    <li key={row.id} title={windowInfo.blocked.get(row.id)}>
                      <SourceChip row={row} keys={config.sourceLabelKeys} onClick={onSourceClick} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </section>
    );
  }

  const registered = source.length - missing.length;
  /** Cuántos de los cubiertos los agregó el propio usuario. */
  const addedByMe =
    ownUid !== null && config.targetOwnerKey !== undefined
      ? target.filter((row) => {
          const owner = row[config.targetOwnerKey!];
          const link = row[config.targetKey];
          return (
            owner === ownUid &&
            typeof link === 'string' &&
            source.some((sourceRow) => sourceRow.id === link)
          );
        }).length
      : null;
  const scoped = scopeStations.length > 0;

  return (
    <section className={`coverage ${missing.length > 0 ? 'has-missing' : ''}`}>
      <div className="coverage-head">
        {missing.length > 0 ? <AlertTriangle size={16} /> : null}
        <span className="coverage-text">
          Of <strong>{source.length}</strong> {config.sourceLabel}
          {scoped ? ' at your station' : ''}, <strong>{registered}</strong> {config.coveredLabel}
          {addedByMe !== null ? (
            <>
              {' '}
              (<strong>{addedByMe}</strong> added by you)
            </>
          ) : null}{' '}
          and <strong>{missing.length}</strong> {config.missingLabel}.
        </span>
        {missing.length > 0 ? (
          <button type="button" className="coverage-toggle" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide list' : 'See which ones'}
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        ) : null}
      </div>

      {open && missing.length > 0 ? (
        <ul className="coverage-list">
          {missing.map((row) => (
            <li key={row.id}>
              {onSourceClick ? (
                <button
                  type="button"
                  className="coverage-chip-btn"
                  title="Open this truck's detail"
                  onClick={() => onSourceClick(row)}
                >
                  {labelOf(row, config.sourceLabelKeys)}
                </button>
              ) : (
                labelOf(row, config.sourceLabelKeys)
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
