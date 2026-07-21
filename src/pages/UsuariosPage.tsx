import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileUp, MailPlus, Plus, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { COLLECTIONS } from '../config/collections';
import { USER_STATUS } from '../config/enums';
import { createUserWithProfile, sendSetPasswordEmail } from '../services/userService';
import { updateDocument } from '../services/firestoreService';
import {
  downloadExcelTemplate,
  exportToExcel,
  type TemplateField,
} from '../services/excelExport';
import { Badge } from '../components/ui/Badge';
import { SaveSummary } from '../components/crud/SaveSummary';
import { ImportCsvModal } from '../components/crud/ImportCsvModal';
import { RecordDetailModal } from '../components/crud/RecordDetailModal';
import type { RefMaps } from '../hooks/useRefMaps';
import { DataTable, type SortDirection, type TableColumn } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Spinner } from '../components/ui/Spinner';
import type { EntityData, FieldConfig, FieldValue } from '../types/models';
import './UsuariosPage.css';

interface UserFormState {
  name: string;
  email: string;
  roleId: string;
  status: string;
}

const EMPTY_FORM: UserFormState = {
  name: '',
  email: '',
  roleId: '',
  status: 'ACTIVO',
};

/** Campos que muestra el visor de detalle de un usuario. */
const USER_DETAIL_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'roleId', label: 'Role', type: 'ref', refCollection: COLLECTIONS.roles },
  { key: 'status', label: 'Status', type: 'text' },
];

/** Campos que valida el importador CSV de usuarios. */
const USER_IMPORT_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text', required: true },
  { key: 'roleId', label: 'Role', type: 'ref', refCollection: COLLECTIONS.roles, required: true },
  { key: 'status', label: 'Status', type: 'text' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** TRUE/SI/ACTIVO -> ACTIVO · FALSE/NO/INACTIVO -> INACTIVO · vacío -> ACTIVO. */
function normalizeUserStatus(raw: FieldValue): string {
  const text = String(raw ?? '').trim().toUpperCase();
  if (text === '' ) return 'ACTIVO';
  if (['TRUE', 'SI', 'SÍ', '1', 'ACTIVO', 'ACTIVE'].includes(text)) return 'ACTIVO';
  if (['FALSE', 'NO', '0', 'INACTIVO', 'INACTIVE'].includes(text)) return 'INACTIVO';
  return 'ACTIVO';
}

/** Campos que muestra el sumario lateral del modal de usuarios. */
const USER_SUMMARY_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text', required: true },
  { key: 'roleId', label: 'Role', type: 'text', required: true },
  { key: 'status', label: 'Status', type: 'text', required: true },
];

/**
 * Módulo de usuarios (BD_USERS): alta con contraseña vía instancia
 * secundaria de Firebase (no cierra la sesión del admin), edición de
 * nombre/rol/estatus y export a Excel. Un usuario INACTIVO no puede entrar.
 */
export function UsuariosPage() {
  const { can } = useAuth();
  const users = useCollection(COLLECTIONS.users);
  const roles = useCollection(COLLECTIONS.roles);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EntityData | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection | null>(null);
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [viewing, setViewing] = useState<EntityData | null>(null);

  const roleName = useMemo(() => {
    const map = new Map<string, string>();
    roles.rows.forEach((r) => map.set(r.id, String(r.name ?? r.id)));
    return map;
  }, [roles.rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users.rows;
    return users.rows.filter((u) =>
      [u.name, u.email, roleName.get(String(u.roleId ?? '')) ?? '', u.status]
        .map((v) => String(v ?? '').toLowerCase())
        .some((v) => v.includes(term)),
    );
  }, [users.rows, search, roleName]);

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
    const textOf = (u: EntityData): string => {
      if (sortKey === 'roleId') return roleName.get(String(u.roleId ?? '')) ?? '';
      return String(u[sortKey] ?? '');
    };
    return [...filtered].sort(
      (a, b) => textOf(a).toLowerCase().localeCompare(textOf(b).toLowerCase()) * direction,
    );
  }, [filtered, sortKey, sortDir, roleName]);

  const PAGE_SIZE = 50;
  const safePage = Math.min(page, Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)));
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns: TableColumn[] = [
    { key: 'name', label: 'Name', render: (r) => String(r.name ?? '—') },
    { key: 'email', label: 'Email', render: (r) => String(r.email ?? '—') },
    {
      key: 'roleId',
      label: 'Role',
      render: (r) => roleName.get(String(r.roleId ?? '')) ?? '—',
    },
    { key: 'status', label: 'Status', render: (r) => <Badge value={String(r.status ?? '—')} /> },
  ];

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setInvalid(false);
    setFormOpen(true);
  };

  const openEdit = (row: EntityData) => {
    setEditing(row);
    setForm({
      name: String(row.name ?? ''),
      email: String(row.email ?? ''),
      roleId: String(row.roleId ?? ''),
      status: String(row.status ?? 'ACTIVO'),
    });
    setError(null);
    setInvalid(false);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const missingBase = !form.name.trim() || !form.roleId || !form.status;
    const missingCreate = !editing && !form.email.trim();
    if (missingBase || missingCreate) {
      setInvalid(true);
      setError(editing ? 'Fill in name, role and status' : 'Fill in all the fields');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updateDocument(COLLECTIONS.users, editing.id, {
          name: form.name.trim(),
          roleId: form.roleId,
          status: form.status,
        });
        setNotice(null);
      } else {
        const email = form.email.trim();
        await createUserWithProfile({
          name: form.name.trim(),
          email,
          roleId: form.roleId,
          status: form.status,
        });
        setNotice(
          `User created. When you decide, send the invitation with the button in Actions.`,
        );
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the user');
    } finally {
      setBusy(false);
    }
  };

  /** Envía (o reenvía) la invitación para establecer contraseña. */
  const handleSendInvite = async (row: EntityData) => {
    const email = String(row.email ?? '');
    if (!email) return;
    try {
      await sendSetPasswordEmail(email);
      setNotice(`Invitation sent to ${email} to set their password.`);
    } catch {
      setNotice(`Could not send the invitation to ${email}. Try again.`);
    }
  };

  /** Plantilla Excel de usuarios con dropdowns de rol y estatus. */
  const handleTemplate = async () => {
    const templateFields: TemplateField[] = [
      {
        label: 'ID',
        required: false,
        type: 'text',
        hint:
          'AppSheet ID (optional, historical reference only). The login identifier is generated by Firebase.',
      },
      { label: 'Name', required: true, type: 'text', hint: 'Text' },
      { label: 'Email', required: true, type: 'text', hint: 'Unique email address' },
      {
        label: 'Role',
        required: true,
        type: 'ref',
        options: roles.rows
          .map((r) => String(r.name ?? ''))
          .filter((n) => n !== '')
          .sort((a, b) => a.localeCompare(b)),
        hint: 'Role name exactly as it exists in the app (use the dropdown)',
      },
      {
        label: 'Status',
        required: false,
        type: 'text',
        options: [...USER_STATUS],
        hint: 'ACTIVO/INACTIVO or AppSheet TRUE/FALSE (empty = ACTIVO)',
      },
    ];
    await downloadExcelTemplate('Usuarios', templateFields);
  };

  /** Escritor del importador: crea la cuenta en Auth + el perfil, SIN enviar correo. */
  const importUserRow = async (
    docId: string | null,
    values: Record<string, FieldValue>,
  ): Promise<void> => {
    const email = String(values.email ?? '').trim();
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error(`"${email}" is not a valid email — the account needs a real email`);
    }
    await createUserWithProfile({
      name: String(values.name ?? ''),
      email,
      roleId: String(values.roleId ?? ''),
      status: normalizeUserStatus(values.status ?? null),
      appsheetId: docId,
    });
  };

  const importRefMaps: RefMaps = {
    [COLLECTIONS.roles]: {
      labels: new Map(roles.rows.map((r) => [r.id, String(r.name ?? r.id)])),
      rows: roles.rows,
    },
  };

  const handleExport = async () => {
    await exportToExcel('Usuarios', [
      { header: 'Nombre', values: filtered.map((u) => String(u.name ?? '')) },
      { header: 'Correo', values: filtered.map((u) => String(u.email ?? '')) },
      {
        header: 'Rol',
        values: filtered.map((u) => roleName.get(String(u.roleId ?? '')) ?? ''),
      },
      { header: 'Estatus', values: filtered.map((u) => String(u.status ?? '')) },
    ]);
  };

  const roleOptions = roles.rows.map((r) => ({ value: r.id, label: String(r.name ?? r.id) }));
  const statusOptions = USER_STATUS.map((s) => ({ value: s, label: s }));

  if (users.loading || roles.loading) return <Spinner />;

  return (
    <div className="usuarios">
      <div className="crud-toolbar">
        <div className="crud-search">
          <Search size={16} />
          <input
            placeholder="Search users…"
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
            title="Download the users Excel template"
            onClick={() => void handleTemplate()}
          >
            <FileDown size={16} />
            Template
          </button>
          {can('users', 'crear') ? (
            <button
              type="button"
              className="btn btn-outline"
              title="Import users from CSV (creates their accounts, no emails sent)"
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
          {can('users', 'crear') ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              Add user
            </button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p className="usuarios-notice">
          <MailPlus size={14} />
          {notice}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={pageRows}
        canEdit={can('users', 'editar')}
        canDelete={false}
        onEdit={openEdit}
        detailLabel="Send invitation to set password"
        onDetail={(row) => void handleSendInvite(row)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(row) => setViewing(row)}
      />
      <Pagination page={safePage} total={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {viewing ? (
        <RecordDetailModal
          title="Users"
          fields={USER_DETAIL_FIELDS}
          record={viewing}
          refLabels={(_c, id) => roleName.get(id) ?? '—'}
          onEdit={
            can('users', 'editar')
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
      <p className="usuarios-hint">
        To deactivate someone set their status to INACTIVO: they will no longer be able to sign
        in. The left button in Actions sends the invitation to set their password — no email is
        sent until you press it.
      </p>

      {importOpen ? (
        <ImportCsvModal
          title="Users"
          collection={COLLECTIONS.users}
          fields={USER_IMPORT_FIELDS}
          refMaps={importRefMaps}
          currentUid={null}
          writeRow={importUserRow}
          onClose={() => setImportOpen(false)}
        />
      ) : null}

      <Modal
        open={formOpen}
        title={editing ? 'Editar usuario' : 'Add user'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            {error ? <span className="usuarios-error">{error}</span> : null}
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
        <div className="usuarios-layout">
        <div className="usuarios-form">
          <div className="field">
            <label className="field-label">
              Name<span className="field-required">*</span>
            </label>
            <input
              className={`field-input ${invalid && !form.name.trim() ? 'field-invalid' : ''}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label">
              Email<span className="field-required">*</span>
            </label>
            <input
              className={`field-input ${invalid && !editing && !form.email.trim() ? 'field-invalid' : ''}`}
              type="email"
              value={form.email}
              disabled={editing !== null}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          {!editing ? (
            <p className="usuarios-email-hint">
              The user will NOT receive any email on creation. When you decide, send the invitation
              with the button in the table and they will get the link to set their own password.
            </p>
          ) : null}
          <div className="field">
            <label className="field-label">
              Role<span className="field-required">*</span>
            </label>
            <SearchableSelect
              value={form.roleId}
              invalid={invalid && !form.roleId}
              options={roleOptions}
              onChange={(v) => setForm((f) => ({ ...f, roleId: v }))}
            />
          </div>
          <div className="field">
            <label className="field-label">
              Status<span className="field-required">*</span>
            </label>
            <SearchableSelect
              value={form.status}
              invalid={invalid && !form.status}
              options={statusOptions}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            />
          </div>
        </div>
        <SaveSummary
          fields={USER_SUMMARY_FIELDS}
          values={{
            name: form.name,
            email: form.email,
            status: form.status,
            roleId: form.roleId === '' ? '' : (roleName.get(form.roleId) ?? form.roleId),
          }}
          refLabels={() => '—'}
        />
        </div>
      </Modal>
    </div>
  );
}
