import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { AlertTriangle, History, Search, Wrench } from 'lucide-react';
import type { AssignedTruck, RemovedTruck } from '../../hooks/useStationTruckChanges';
import './MyTrucksModal.css';

export interface MyTruckRow {
  id: string;
  label: string;
  /** Estado en la ventana vigente. */
  state: 'added' | 'blocked' | 'pending';
  /** Detalle ("added in BC Report 08/25 · by …" o el motivo del bloqueo). */
  detail: string;
  /** Por qué no se exige: orden de taller abierta o correctivo pendiente. */
  blockKind?: 'shop' | 'corrective';
}

/** Orden de la lista: taller y correctivo ARRIBA, luego pendientes, luego agregados. */
function rank(truck: MyTruckRow): number {
  if (truck.state === 'blocked') return truck.blockKind === 'shop' ? 0 : 1;
  return truck.state === 'pending' ? 2 : 3;
}

interface MyTrucksModalProps {
  stationNames: string;
  trucks: MyTruckRow[];
  /** Camiones capturados por su estación que ya no cuentan (movidos/baja). */
  moved: { id: string; label: string; reason: string }[];
  /** Camiones que le ASIGNARON / QUITARON desde la última vez que revisó. */
  assigned?: AssignedTruck[];
  removed?: RemovedTruck[];
  /** Abre el histórico de movimientos de estación de un camión. */
  onShowHistory?: (id: string, label: string) => void;
  /** Clic en un camión: abre su detalle. */
  onTruckClick?: (id: string) => void;
  onClose: () => void;
}

/** Botón de histórico de estaciones de un camión. */
function HistoryButton({
  id,
  label,
  onShowHistory,
}: {
  id: string;
  label: string;
  onShowHistory?: (id: string, label: string) => void;
}) {
  if (!onShowHistory) return null;
  return (
    <button
      type="button"
      className="mytrucks-history-btn"
      title="Station history of this truck"
      onClick={() => onShowHistory(id, label)}
    >
      <History size={13} />
      History
    </button>
  );
}

const STATE_LABEL: Record<MyTruckRow['state'], string> = {
  added: 'ADDED',
  blocked: 'NOT REQUIRED',
  pending: 'PENDING',
};

/** Etiqueta del estado; el bloqueado dice POR QUÉ (taller o correctivo). */
function stateLabel(truck: MyTruckRow): string {
  if (truck.state !== 'blocked') return STATE_LABEL[truck.state];
  return truck.blockKind === 'shop' ? 'IN SHOP' : 'CORRECTIVE';
}

/**
 * "My trucks": la vista del BC sobre SU estación. Arriba, las novedades que
 * le importan (camiones que su estación capturó y que hoy figuran en otra
 * estación o de baja); abajo, todos los camiones de su Current station con
 * su estado en la ventana vigente (agregado / en taller / pendiente), con
 * buscador por número.
 */
export function MyTrucksModal({
  stationNames,
  trucks,
  moved,
  assigned = [],
  removed = [],
  onShowHistory,
  onTruckClick,
  onClose,
}: MyTrucksModalProps) {
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  // Consecutivo REAL: cada camión conserva su número aunque se filtre.
  const numbered = [...trucks]
    .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, undefined, { numeric: true }))
    .map((truck, index) => ({ truck, n: index + 1 }));
  const filtered =
    needle === ''
      ? numbered
      : numbered.filter(({ truck }) => truck.label.toLowerCase().includes(needle));
  const added = trucks.filter((t) => t.state === 'added').length;
  const pending = trucks.filter((t) => t.state === 'pending').length;
  const inShop = trucks.filter((t) => t.state === 'blocked' && t.blockKind === 'shop').length;
  const corrective = trucks.filter((t) => t.state === 'blocked' && t.blockKind !== 'shop').length;

  return (
    <Modal open title={`My trucks · Station ${stationNames}`} onClose={onClose} size="lg">
      {assigned.length + removed.length > 0 ? (
        <div className="mytrucks-changes">
          <strong>Changes at your station since you last checked</strong>
          {assigned.length > 0 ? (
            <div className="mytrucks-changes-group is-in">
              <span className="mytrucks-changes-title">
                Assigned to your station ({assigned.length})
              </span>
              <ul>
                {assigned.map((item) => (
                  <li key={item.id}>
                    <span className="mytrucks-changes-label">{item.label}</span>
                    <HistoryButton id={item.id} label={item.label} onShowHistory={onShowHistory} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {removed.length > 0 ? (
            <div className="mytrucks-changes-group is-out">
              <span className="mytrucks-changes-title">
                Taken away from your station ({removed.length})
              </span>
              <ul>
                {removed.map((item) => (
                  <li key={item.id}>
                    <span className="mytrucks-changes-label">{item.label}</span>
                    <span className="mytrucks-detail">— {item.reason}</span>
                    <HistoryButton id={item.id} label={item.label} onShowHistory={onShowHistory} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <small>These notices are cleared when you close this window.</small>
        </div>
      ) : null}
      {moved.length > 0 ? (
        <div className="mytrucks-alert">
          <strong>
            {moved.length} truck{moved.length === 1 ? '' : 's'} captured by your station no longer
            count for it:
          </strong>
          <ul>
            {moved.map((item) => (
              <li key={item.id}>
                {onTruckClick ? (
                  <button type="button" className="mytrucks-link" onClick={() => onTruckClick(item.id)}>
                    {item.label}
                  </button>
                ) : (
                  item.label
                )}{' '}
                — {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mytrucks-head">
        <span>
          <strong>{trucks.length}</strong> trucks at your station · <strong>{added}</strong> added
          this window · <strong>{pending}</strong> pending
          {inShop > 0 ? (
            <>
              {' '}
              · <Wrench size={13} className="mytrucks-kind is-shop" /> <strong>{inShop}</strong> in
              shop
            </>
          ) : null}
          {corrective > 0 ? (
            <>
              {' '}
              · <AlertTriangle size={13} className="mytrucks-kind is-corrective" />{' '}
              <strong>{corrective}</strong> corrective
            </>
          ) : null}
        </span>
        <span className="mytrucks-search">
          <Search size={14} />
          <input
            type="text"
            value={search}
            placeholder="Search by truck number…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </span>
      </div>

      <ul className="mytrucks-list">
        {filtered.map(({ truck, n }) => (
          <li key={truck.id} className={`is-${truck.state}`}>
            <span className="mytrucks-num">{n}</span>
            <span className="mytrucks-icon">
              {truck.state === 'blocked' && truck.blockKind === 'shop' ? (
                <Wrench size={15} className="mytrucks-kind is-shop" aria-label="In shop" />
              ) : null}
              {truck.state === 'blocked' && truck.blockKind !== 'shop' ? (
                <AlertTriangle
                  size={15}
                  className="mytrucks-kind is-corrective"
                  aria-label="Corrective maintenance pending"
                />
              ) : null}
            </span>
            {onTruckClick ? (
              <button
                type="button"
                className="mytrucks-label mytrucks-link"
                title="Open this truck's detail"
                onClick={() => onTruckClick(truck.id)}
              >
                {truck.label}
              </button>
            ) : (
              <span className="mytrucks-label">{truck.label}</span>
            )}
            <span className="mytrucks-state">{stateLabel(truck)}</span>
            <span className="mytrucks-detail">{truck.detail}</span>
            <HistoryButton id={truck.id} label={truck.label} onShowHistory={onShowHistory} />
          </li>
        ))}
        {filtered.length === 0 ? <li className="mytrucks-empty">No match for “{search}”</li> : null}
      </ul>
    </Modal>
  );
}
