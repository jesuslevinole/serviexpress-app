import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Search } from 'lucide-react';
import './MyTrucksModal.css';

export interface MyTruckRow {
  id: string;
  label: string;
  /** Estado en la ventana vigente. */
  state: 'added' | 'blocked' | 'pending';
  /** Detalle ("added in BC Report 08/25 · by …" o el motivo del bloqueo). */
  detail: string;
}

interface MyTrucksModalProps {
  stationNames: string;
  trucks: MyTruckRow[];
  /** Camiones capturados por su estación que ya no cuentan (movidos/baja). */
  moved: { id: string; label: string; reason: string }[];
  onClose: () => void;
}

const STATE_LABEL: Record<MyTruckRow['state'], string> = {
  added: 'ADDED',
  blocked: 'NOT REQUIRED',
  pending: 'PENDING',
};

/**
 * "My trucks": la vista del BC sobre SU estación. Arriba, las novedades que
 * le importan (camiones que su estación capturó y que hoy figuran en otra
 * estación o de baja); abajo, todos los camiones de su Current station con
 * su estado en la ventana vigente (agregado / en taller / pendiente), con
 * buscador por número.
 */
export function MyTrucksModal({ stationNames, trucks, moved, onClose }: MyTrucksModalProps) {
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const filtered =
    needle === '' ? trucks : trucks.filter((t) => t.label.toLowerCase().includes(needle));
  const added = trucks.filter((t) => t.state === 'added').length;
  const pending = trucks.filter((t) => t.state === 'pending').length;

  return (
    <Modal open title={`My trucks · Station ${stationNames}`} onClose={onClose} size="lg">
      {moved.length > 0 ? (
        <div className="mytrucks-alert">
          <strong>
            {moved.length} truck{moved.length === 1 ? '' : 's'} captured by your station no longer
            count for it:
          </strong>
          <ul>
            {moved.map((item) => (
              <li key={item.id}>
                {item.label} — {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mytrucks-head">
        <span>
          <strong>{trucks.length}</strong> trucks at your station · <strong>{added}</strong> added
          this window · <strong>{pending}</strong> pending
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
        {filtered.map((truck) => (
          <li key={truck.id} className={`is-${truck.state}`}>
            <span className="mytrucks-label">{truck.label}</span>
            <span className="mytrucks-state">{STATE_LABEL[truck.state]}</span>
            <span className="mytrucks-detail">{truck.detail}</span>
          </li>
        ))}
        {filtered.length === 0 ? <li className="mytrucks-empty">No match for “{search}”</li> : null}
      </ul>
    </Modal>
  );
}
