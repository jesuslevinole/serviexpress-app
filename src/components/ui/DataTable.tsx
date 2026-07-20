import type { ReactNode } from 'react';
import { Pencil, Trash2, ListPlus } from 'lucide-react';
import './DataTable.css';

export interface TableColumn {
  key: string;
  label: string;
  render: (row: Record<string, unknown> & { id: string }) => ReactNode;
}

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
}: DataTableProps<T>) {
  const showActions = (canEdit && onEdit) || (canDelete && onDelete) || onDetail;

  return (
    <div className="dtable-wrap">
      <table className="dtable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
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
