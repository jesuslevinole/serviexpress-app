import { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import './CaptureWindow.css';

/** Renglones que se muestran sin pedirlo; el resto, bajo "Show all". */
const PREVIEW = 6;

interface BlockedItem {
  id: string;
  label: string;
  reason: string;
}

interface BlockedRefsNoteProps {
  /** "87 trucks can't be added right now" */
  title: string;
  items: BlockedItem[];
  /** Placeholder del buscador ("Search by truck number…"). */
  searchPlaceholder: string;
  /** Clic en un elemento: abre su detalle. */
  onItemClick?: (id: string) => void;
}

/**
 * Lista de elementos que hoy no se pueden capturar (camión ya agregado en la
 * ventana, en taller, de otra estación), con un buscador por número: con 80+
 * camiones bloqueados, el BC teclea el número y ve al instante por qué no
 * aparece en el desplegable y quién lo agregó.
 */
export function BlockedRefsNote({
  title,
  items,
  searchPlaceholder,
  onItemClick,
}: BlockedRefsNoteProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const needle = search.trim().toLowerCase();
  const filtered =
    needle === '' ? items : items.filter((item) => item.label.toLowerCase().includes(needle));
  // Dentro del formulario esta nota convive con los campos: si pinta los 60
  // de golpe, empuja el millaje y las llantas fuera de la vista. Se enseñan
  // unos pocos y el buscador hace el resto.
  const limit = expanded ? 200 : needle === '' ? PREVIEW : 20;
  const shown = filtered.slice(0, limit);
  const hidden = filtered.length - shown.length;

  return (
    <div className="cwin-note">
      <div className="cwin-note-head">
        <strong>{title}</strong> (they are out of the list):
        <span className="cwin-note-search">
          <Search size={14} />
          <input
            type="text"
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
          />
        </span>
      </div>
      <ul>
        {shown.map((item) => (
          <li key={item.id}>
            {onItemClick ? (
              <button type="button" className="cwin-truck-btn" onClick={() => onItemClick(item.id)}>
                {item.label}
              </button>
            ) : (
              item.label
            )}{' '}
            — {item.reason}
          </li>
        ))}
        {filtered.length === 0 ? (
          <li>No blocked {needle === '' ? 'items' : `match for "${search}"`}</li>
        ) : null}
      </ul>
      {hidden > 0 || expanded ? (
        <button type="button" className="cwin-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show fewer' : `Show all ${filtered.length}`}
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      ) : null}
    </div>
  );
}
