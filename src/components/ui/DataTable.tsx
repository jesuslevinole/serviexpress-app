import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Trash2, ListPlus } from 'lucide-react';
import './DataTable.css';

export interface TableColumn {
  key: string;
  label: string;
  render: (row: Record<string, unknown> & { id: string }) => ReactNode;
}

export type SortDirection = 'asc' | 'desc';

interface DataTableProps<T extends { id: string }> {
  columns: TableColumn[];
  rows: T[];
  emptyMessage?: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  detailLabel?: string;
  onDetail?: (row: T) => void;
  /** Columna por la que se ordena (null = orden original). */
  sortKey?: string | null;
  sortDir?: SortDirection | null;
  /** Si se define, los encabezados son clicables para ordenar. */
  onSort?: (key: string) => void;
}

/** Tabla genérica con acciones. Todas las tablas del app pasan por aquí. */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = 'Sin registros todavía',
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  detailLabel,
  onDetail,
  sortKey = null,
  sortDir = null,
  onSort,
}: DataTableProps<T>) {
  const showActions = (canEdit && onEdit) || (canDelete && onDelete) || onDetail;

  const sortIcon = (key: string) => {
    if (sortKey !== key || !sortDir) return <ChevronsUpDown size={13} className="dtable-sort-idle" />;
    return sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  return (
    <div className="dtable-wrap">
      <table className="dtable">
        <thead>
          <tr>
            {columns.map((col) =>
              onSort ? (
                <th
                  key={col.key}
                  className={`dtable-sortable ${sortKey === col.key && sortDir ? 'is-sorted' : ''}`}
                  onClick={() => onSort(col.key)}
                  title={`Ordenar por ${col.label}`}
                >
                  <span className="dtable-th-inner">
                    {col.label}
                    {sortIcon(col.key)}
                  </span>
                </th>
              ) : (
                <th key={col.key}>{col.label}</th>
              ),
            )}
            {showActions ? <th className="dtable-actions-col">Acciones</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="dtable-empty" colSpan={columns.length + (showActions ? 1 : 0)}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
                {showActions ? (
                  <td className="dtable-actions">
                    {onDetail ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title={detailLabel ?? 'Detalle'}
                        onClick={() => onDetail(row)}
                      >
                        <ListPlus size={16} />
                      </button>
                    ) : null}
                    {canEdit && onEdit ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Editar"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil size={16} />
                      </button>
                    ) : null}
                    {canDelete && onDelete ? (
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Eliminar"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}