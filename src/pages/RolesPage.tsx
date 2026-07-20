import { useMemo, useState } from 'react';
import { FileSpreadsheet, Plus, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { COLLECTIONS } from '../config/collections';
import { PERMISSION_MODULES } from '../config/modules';
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from '../services/firestoreService';
import { exportToExcel } from '../services/excelExport';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SaveSummary } from '../components/crud/SaveSummary';
import { DataTable, type TableColumn } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import type {
  EntityData,
  FieldConfig,
  ModulePermissions,
  PermissionAction,
} from '../types/models';
import './RolesPage.css';

const ACTIONS: PermissionAction[] = ['ver', 'crear', 'editar', 'eliminar'];

/** Campos que muestra el sumario lateral del modal de roles. */
const ROLE_SUMMARY_FIELDS: FieldConfig[] = [{ key: 'name', label: 'Rol', type: 'text' }];

type PermissionMatrix = Record<string, ModulePermissions>;

function parsePermissions(row: EntityData | null): PermissionMatrix {
  if (!row) return {};
  const raw = (row as unknown as { permissions?: unknown }).permissions;
  if (typeof raw !== 'object' || raw === null) return {};
  return raw as PermissionMatrix;
}

/**
 * Módulo de roles: matriz de permisos ver/crear/editar/eliminar por módulo.
 * El sidebar y cada pantalla respetan estos permisos en tiempo real.
 */
export function RolesPage() {
  const { can } = useAuth();
  const roles = useCollection(COLLECTIONS.roles);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EntityData | null>(null);
  const [name, setName] = useState('');
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [deleting, setDeleting] = useState<EntityData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionIds, setSessionIds] = useState<ReadonlySet<string>>(new Set());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles.rows;
    return roles.rows.filter((r) => String(r.name ?? '').toLowerCase().includes(term));
  }, [roles.rows, search]);

  const countPermissions = (row: EntityData): number => {
    const permissions = parsePermissions(row);
    return PERMISSION_MODULES.reduce((total, module) => {
      const modulePerms = permissions[module.id];
      if (!modulePerms) return total;
      return total + ACTIONS.filter((a) => modulePerms[a] === true).length;
    }, 0);
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Rol', render: (r) => String(r.name ?? '—') },
    {
      key: 'permissions',
      label: 'Permisos activos',
      render: (r) => `${countPermissions(r as EntityData)} permisos`,
    },
  ];

  const openCreate = () => {
    setEditing(null);
    setName('');
    setMatrix({});
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (row: EntityData) => {
    setEditing(row);
    setName(String(row.name ?? ''));
    setMatrix(parsePermissions(row));
    setError(null);
    setFormOpen(true);
  };

  const toggle = (moduleId: string, action: PermissionAction) => {
    setMatrix((prev) => {
      const current = prev[moduleId] ?? {};
      const nextValue = current[action] !== true;
      const nextModule: ModulePermissions = { ...current, [action]: nextValue };
      if (action !== 'ver' && nextValue) {
        nextModule.ver = true;
      }
      if (action === 'ver' && !nextValue) {
        nextModule.crear = false;
        nextModule.editar = false;
        nextModule.eliminar = false;
      }
      return { ...prev, [moduleId]: nextModule };
    });
  };

  const toggleAllForModule = (moduleId: string) => {
    setMatrix((prev) => {
      const current = prev[moduleId] ?? {};
      const allOn = ACTIONS.every((a) => current[a] === true);
      const next: ModulePermissions = allOn
        ? { ver: false, crear: false, editar: false, eliminar: false }
        : { ver: true, crear: true, editar: true, eliminar: true };
      return { ...prev, [moduleId]: next };
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('El rol necesita un nombre');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = { name: name.trim(), permissions: matrix };
      if (editing) {
        await updateDocument(COLLECTIONS.roles, editing.id, payload);
        setSessionIds((prev) => new Set(prev).add(editing.id));
      } else {
        const newId = await createDocument(COLLECTIONS.roles, payload);
        setSessionIds((prev) => new Set(prev).add(newId));
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el rol');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteDocument(COLLECTIONS.roles, deleting.id);
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  };

  const handleExport = async () => {
    await exportToExcel('Roles', [
      { header: 'Rol', values: filtered.map((r) => String(r.name ?? '')) },
      ...PERMISSION_MODULES.map((module) => ({
        header: module.title,
        values: filtered.map((r) => {
          const perms = parsePermissions(r)[module.id];
          if (!perms) return '—';
          const active = ACTIONS.filter((a) => perms[a] === true);
          return active.length > 0 ? active.join(', ') : '—';
        }),
      })),
    ]);
  };

  if (roles.loading) return <Spinner />;

  return (
    <div className="roles">
      <div className="crud-toolbar">
        <div className="crud-search">
          <Search size={16} />
          <input
            placeholder="Buscar roles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="crud-toolbar-actions">
          <button type="button" className="btn btn-outline" onClick={handleExport}>
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
          {can('roles', 'crear') ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              Agregar rol
            </button>
          ) : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        canEdit={can('roles', 'editar')}
        canDelete={can('roles', 'eliminar')}
        onEdit={openEdit}
        onDelete={(row) => setDeleting(row)}
      />

      <Modal
        open={formOpen}
        title={editing ? 'Editar rol' : 'Agregar rol'}
        onClose={() => setFormOpen(false)}
        size="lg"
        footer={
          <>
            {error ? <span className="roles-error">{error}</span> : null}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setFormOpen(false)}
              disabled={busy}
            >
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="roles-layout">
        <div className="roles-form-col">
        <div className="field roles-name">
          <label className="field-label">
            Nombre del rol<span className="field-required">*</span>
          </label>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Supervisor de estación"
          />
        </div>

        <div className="roles-matrix-wrap">
          <table className="roles-matrix">
            <thead>
              <tr>
                <th>Módulo</th>
                {ACTIONS.map((action) => (
                  <th key={action}>{action}</th>
                ))}
                <th>Todo</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map((module) => {
                const perms = matrix[module.id] ?? {};
                return (
                  <tr key={module.id}>
                    <td>{module.title}</td>
                    {ACTIONS.map((action) => (
                      <td key={action}>
                        <input
                          type="checkbox"
                          checked={perms[action] === true}
                          onChange={() => toggle(module.id, action)}
                          aria-label={`${module.title}: ${action}`}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="roles-all-btn"
                        onClick={() => toggleAllForModule(module.id)}
                      >
                        Alternar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
        <SaveSummary
          fields={ROLE_SUMMARY_FIELDS}
          rows={filtered}
          refLabels={() => '—'}
          sessionIds={sessionIds}
        />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar rol"
        message="¿Seguro que quieres eliminar este rol? Los usuarios que lo tengan asignado perderán acceso."
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}