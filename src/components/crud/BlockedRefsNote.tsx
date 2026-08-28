import { useState } from 'react';
import { Search } from 'lucide-react';
import './CaptureWindow.css';

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
}

/**
 * Lista de elementos que hoy no se pueden capturar (camión ya agregado en la
 * ventana, en taller, de otra estación), con un buscador por número: con 80+
 * camiones bloqueados, el BC teclea el número y ve al instante por qué no
 * aparece en el desplegable y quién lo agregó.
 */
export function BlockedRefsNote({ title, items, searchPlaceholder }: BlockedRefsNoteProps) {
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const filtered =
    needle === '' ? items : items.filter((item) => item.label.toLowerCase().includes(needle));

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
        {filtered.slice(0, 60).map((item) => (
          <li key={item.id}>
            {item.label} — {item.reason}
          </li>
        ))}
        {filtered.length > 60 ? <li>…and {filtered.length - 60} more (narrow the search)</li> : null}
        {filtered.length === 0 ? <li>No blocked {needle === '' ? 'items' : `match for "${search}"`}</li> : null}
      </ul>
    </div>
  );
}
