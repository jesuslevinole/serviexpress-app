import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileUp, Plus, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { COLLECTIONS } from '../config/collections';
import { PERMISSION_MODULES } from '../config/modules';
import {
  createDocument,
  deleteDocument,
  setDocument,
  updateDocument,
} from '../services/firestoreService';
import {
  downloadExcelTemplate,
  exportToExcel,
  type TemplateField,
} from '../services/excelExport';
import { normalizeText } from '../services/csv';
import { ImportCsvModal } from '../components/crud/ImportCsvModal';
import { RecordDetailModal } from '../components/crud/RecordDetailModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable, type SortDirection, type TableColumn } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Spinner } from '../components/ui/Spinner';
import type {
  EntityData,
  FieldConfig,
  FieldValue,
  ModulePermissions,
  PermissionAction,
  ViewScope,
} from '../types/models';
import './RolesPage.css';

const ACTIONS: PermissionAction[] = [
  'ver',
  'crear',
  'editar',
  'eliminar',
  'plantilla',
  'importar',
  'exportar',
  'filtrar',
  'verFinanzas',
  'verNotas',
  'altaRapida',
  'eliminarMasivo',
  'configurarForm',
];

/** Encabezado legible de cada acción en la matriz. */
const ACTION_LABEL: Record<PermissionAction, string> = {
  ver: 'View',
  crear: 'Create',
  editar: 'Edit',
  eliminar: 'Delete',
  plantilla: 'Template',
  importar: 'Import CSV',
  exportar: 'Export Excel',
  filtrar: 'Filters',
  verFinanzas: 'Money fields',
  verNotas: 'Internal notes',
  altaRapida: 'Quick add (+)',
  eliminarMasivo: 'Bulk delete',
  configurarForm: 'Configure form',
};

/** Opciones de visibilidad de registros por módulo (columna Visibility de la matriz). */
const VIEW_SCOPES: { value: ViewScope; label: string; title: string }[] = [
  { value: 'all', label: 'All', title: 'Sees every record of the module' },
  { value: 'own', label: 'Own', title: 'Sees only the records they captured' },
  { value: 'station', label: 'Station', title: 'Sees the records of their assigned stations' },
  {
    value: 'entity_station',
    label: 'St+Ent',
    title: 'Records matching both their station and entity',
  },
];

/** Campos que muestra el sumario lateral del modal de roles. */
const ROLE_SUMMARY_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Role', type: 'text', required: true },
];

/** Campos del importador CSV: nombre + una columna de permisos por módulo. */
const ROLE_IMPORT_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Role', type: 'text', required: true },
  ...PERMISSION_MODULES.map(
    (module): FieldConfig => ({ key: module.id, label: module.title, type: 'text' }),
  ),
];

const PERMISSION_COMBOS = [
  'todo',
  'ver',
  'ver, crear',
  'ver, crear, editar',
  'ver, crear, editar, eliminar',
];

/** "ver, crear" | "todo" -> permisos del módulo. Otorgar algo implica ver. */
function parsePermissionTokens(raw: string): ModulePermissions | null {
  const tokens = raw
    .split(/[,;/\s]+/)
    .map((t) => normalizeText(t))
    .filter((t) => t !== '');
  if (tokens.length === 0) return null;
  const perms: ModulePermissions = {};
  tokens.forEach((token) => {
    if (token === 'todo' || token === 'all') {
      perms.ver = true;
      perms.crear = true;
      perms.editar = true;
      perms.eliminar = true;
    } else if (token === 'ver' || token === 'crear' || token === 'editar' || token === 'eliminar') {
      perms[token] = true;
    }
  });
  if (perms.crear || perms.editar || perms.eliminar) perms.ver = true;
  return Object.values(perms).some((v) => v === true) ? perms : null;
}

type PermissionMatrix = Record<string, ModulePermissions>;

function parsePermissions(row: EntityData | null): PermissionMatrix {
  if (!row) return {};
  const raw = (row as unknown as { permissions?: unknown }).permissions;
  if (typeof raw === 'string' && raw.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed as PermissionMatrix;
    } catch {
      return {};
    }
  }
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
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [viewing, setViewing] = useState<EntityData | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles.rows;
    return roles.rows.filter((r) => String(r.name ?? '').toLowerCase().includes(term));
  }, [roles.rows, search]);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const direction = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'permissions') {
      return [...filtered].sort(
        (a, b) => (countPermissions(a) - countPermissions(b)) * direction,
      );
    }
    return [...filtered].sort(
      (a, b) =>
        String(a.name ?? '')
          .toLowerCase()
          .localeCompare(String(b.name ?? '').toLowerCase()) * direction,
    );
     
  }, [filtered, sortKey, sortDir]);

  const PAGE_SIZE = 50;
  const safePage = Math.min(page, Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)));
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const countPermissions = (row: EntityData): number => {
    const permissions = parsePermissions(row);
    return PERMISSION_MODULES.reduce((total, module) => {
      const modulePerms = permissions[module.id];
      if (!modulePerms) return total;
      return total + ACTIONS.filter((a) => modulePerms[a] === true).length;
    }, 0);
  };

  const columns: TableColumn[] = [
    { key: 'name', label: 'Role', render: (r) => String(r.name ?? '—') },
    {
      key: 'permissions',
      label: 'Active permissions',
      render: (r) => `${countPermissions(r as EntityData)} permissions`,
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

  /** Filtro por nombre de módulo: la matriz tiene más de 20 renglones. */
  const [moduleFilter, setModuleFilter] = useState('');
  const shownModules = useMemo(() => {
    const term = moduleFilter.trim().toLowerCase();
    if (term === '') return PERMISSION_MODULES;
    return PERMISSION_MODULES.filter((m) => m.title.toLowerCase().includes(term));
  }, [moduleFilter]);

  const setScope = (moduleId: string, alcance: ViewScope) => {
    setMatrix((prev) => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] ?? {}), alcance },
    }));
  };

  const toggleAllForModule = (moduleId: string) => {
    setMatrix((prev) => {
      const current = prev[moduleId] ?? {};
      const allOn = ACTIONS.every((a) => current[a] === true);
      const next: ModulePermissions = ACTIONS.reduce<ModulePermissions>(
        (acc, action) => ({ ...acc, [action]: !allOn }),
        {},
      );
      return { ...prev, [moduleId]: next };
    });
  };

  /** Marca o desmarca una acción en TODOS los módulos visibles. */
  const toggleColumn = (action: PermissionAction) => {
    setMatrix((prev) => {
      const allOn = shownModules.every((m) => prev[m.id]?.[action] === true);
      const next = { ...prev };
      shownModules.forEach((m) => {
        next[m.id] = { ...(next[m.id] ?? {}), [action]: !allOn };
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('The role needs a name');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = { name: name.trim(), permissions: matrix };
      if (editing) {
        await updateDocument(COLLECTIONS.roles, editing.id, payload);
      } else {
        await createDocument(COLLECTIONS.roles, payload);
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the role');
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

  /** Plantilla Excel de roles: una columna de permisos por módulo. */
  const handleTemplate = async () => {
    const templateFields: TemplateField[] = [
      {
        label: 'ID',
        required: false,
        type: 'text',
        hint: 'AppSheet ID (optional). Re-importing with the same ID updates the role.',
      },
      { label: 'Role', required: true, type: 'text', hint: 'Role name' },
      ...PERMISSION_MODULES.map(
        (module): TemplateField => ({
          label: module.title,
          required: false,
          type: 'text',
          options: PERMISSION_COMBOS,
          hint: 'Comma separated permissions: ver, crear, editar, eliminar — or "todo". Empty = no access.',
        }),
      ),
    ];
    await downloadExcelTemplate('Roles', templateFields);
  };

  /** Escritor del importador: arma la matriz de permisos desde las columnas. */
  const importRoleRow = async (
    docId: string | null,
    values: Record<string, FieldValue>,
  ): Promise<void> => {
    const permissions: PermissionMatrix = {};
    PERMISSION_MODULES.forEach((module) => {
      const raw = values[module.id];
      if (typeof raw !== 'string' || raw.trim() === '') return;
      const perms = parsePermissionTokens(raw);
      if (perms) permissions[module.id] = perms;
    });
    const payload = { name: String(values.name ?? ''), permissions };
    if (docId) {
      await setDocument(COLLECTIONS.roles, docId, payload);
    } else {
      await createDocument(COLLECTIONS.roles, payload);
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
            placeholder="Search roles…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="crud-toolbar-actions">
          <button
            type="button"
            className="btn btn-outline"
            title="Download the roles Excel template"
            onClick={() => void handleTemplate()}
          >
            <FileDown size={16} />
            Template
          </button>
          {can('roles', 'crear') ? (
            <button
              type="button"
              className="btn btn-outline"
              title="Import roles from CSV"
              onClick={() => setImportOpen(true)}
            >
              <FileUp size={16} />
              Import CSV
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={handleExport}>
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
          {can('roles', 'crear') ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              Add role
            </button>
          ) : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        canEdit={can('roles', 'editar')}
        canDelete={can('roles', 'eliminar')}
        onEdit={openEdit}
        onDelete={(row) => setDeleting(row)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(row) => setViewing(row)}
      />
      <Pagination page={safePage} total={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {viewing ? (
        <RecordDetailModal
          title="Roles"
          fields={ROLE_SUMMARY_FIELDS}
          record={viewing}
          refLabels={() => '—'}
          extra={
            <div className="roles-detail-perms">
              <strong>Permissions per module</strong>
              <ul>
                {PERMISSION_MODULES.map((module) => {
                  const perms = parsePermissions(viewing)[module.id];
                  const active = perms
                    ? ACTIONS.filter((action) => perms[action] === true)
                    : [];
                  if (active.length === 0) return null;
                  return (
                    <li key={module.id}>
                      <span>{module.title}</span>
                      <em>{active.join(', ')}</em>
                    </li>
                  );
                })}
              </ul>
            </div>
          }
          onEdit={
            can('roles', 'editar')
              ? () => {
                  const row = viewing;
                  setViewing(null);
                  openEdit(row);
                }
              : undefined
          }
          onClose={() => setViewing(null)}
        />
      ) : null}

      <Modal
        open={formOpen}
        title={editing ? 'Edit role' : 'Add role'}
        onClose={() => setFormOpen(false)}
        size="xl"
        footer={
          <>
            {error ? <span className="roles-error">{error}</span> : null}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setFormOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="roles-layout">
        <div className="roles-form-col">
        <div className="field roles-name">
          <label className="field-label">
            Role name<span className="field-required">*</span>
          </label>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Station supervisor"
          />
        </div>

        <div className="roles-toolbar">
          <label className="roles-filter">
            <Search size={15} />
            <input
              value={moduleFilter}
              placeholder="Filter modules…"
              onChange={(e) => setModuleFilter(e.target.value)}
            />
          </label>
          <span className="roles-count">
            {ACTIONS.reduce(
              (total, action) =>
                total + PERMISSION_MODULES.filter((m) => matrix[m.id]?.[action] === true).length,
              0,
            )}{' '}
            permissions active
          </span>
        </div>

        <div className="roles-matrix-wrap">
          <table className="roles-matrix">
            <thead>
              <tr>
                <th className="roles-col-module">Module</th>
                {ACTIONS.map((action) => (
                  <th key={action}>
                    <button
                      type="button"
                      className="roles-col-toggle"
                      title={`Check or uncheck "${ACTION_LABEL[action]}" for every module shown`}
                      onClick={() => toggleColumn(action)}
                    >
                      {ACTION_LABEL[action]}
                    </button>
                  </th>
                ))}
                <th>All</th>
                  <th>Visible records</th>
              </tr>
            </thead>
            <tbody>
              {shownModules.map((module) => {
                const perms = matrix[module.id] ?? {};
                return (
                  <tr key={module.id}>
                    <td className="roles-col-module">{module.title}</td>
                    {ACTIONS.map((action) => (
                      <td key={action}>
                        <input
                          type="checkbox"
                          checked={perms[action] === true}
                          onChange={() => toggle(module.id, action)}
                          aria-label={`${module.title}: ${ACTION_LABEL[action]}`}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="roles-all-btn"
                        onClick={() => toggleAllForModule(module.id)}
                      >
                        Toggle
                      </button>
                    </td>
                    <td>
                      <div className="roles-scope" role="group" aria-label="Visible records">
                        {VIEW_SCOPES.map((option) => {
                          const active = (matrix[module.id]?.alcance ?? 'all') === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`roles-scope-btn ${active ? 'is-active' : ''}`}
                              title={option.title}
                              aria-pressed={active}
                              onClick={() => setScope(module.id, option.value)}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
        </div>
      </Modal>

      {importOpen ? (
        <ImportCsvModal
          title="Roles"
          collection={COLLECTIONS.roles}
          fields={ROLE_IMPORT_FIELDS}
          refMaps={{}}
          currentUid={null}
          writeRow={importRoleRow}
          onClose={() => setImportOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete role"
        message="Are you sure you want to delete this role? Users assigned to it will lose access."
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}