import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/** Paginador estándar de todas las tablas (50 por página). */
export function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  if (total <= pageSize) {
    return (
      <div className="pager">
        <span className="pager-info">
          {total === 0 ? 'Sin registros' : `Mostrando ${from}–${to} de ${total}`}
        </span>
      </div>
    );
  }

  return (
    <div className="pager">
      <span className="pager-info">
        Mostrando {from}–{to} de {total}
      </span>
      <div className="pager-controls">
        <button
          type="button"
          className="icon-btn"
          disabled={safePage <= 1}
          onClick={() => onChange(safePage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={17} />
        </button>
        <span className="pager-page">
          Página {safePage} de {totalPages}
        </span>
        <button
          type="button"
          className="icon-btn"
          disabled={safePage >= totalPages}
          onClick={() => onChange(safePage + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}