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

/** Campos que valida el importador CSV de usuarios. */
const USER_IMPORT_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Nombre', type: 'text', required: true },
  { key: 'email', label: 'Correo', type: 'text', required: true },
  { key: 'roleId', label: 'Rol', type: 'ref', refCollection: COLLECTIONS.roles, required: true },
  { key: 'status', label: 'Estatus', type: 'text' },
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
  { key: 'name', label: 'Nombre', type: 'text', required: true },
  { key: 'email', label: 'Correo', type: 'text', required: true },
  { key: 'roleId', label: 'Rol', type: 'text', required: true },
  { key: 'status', label: 'Estatus', type: 'text', required: true },
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
    { key: 'name', label: 'Nombre', render: (r) => String(r.name ?? '—') },
    { key: 'email', label: 'Correo', render: (r) => String(r.email ?? '—') },
    {
      key: 'roleId',
      label: 'Rol',
      render: (r) => roleName.get(String(r.roleId ?? '')) ?? '—',
    },
    { key: 'status', label: 'Estatus', render: (r) => <Badge value={String(r.status ?? '—')} /> },
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
      setError(editing ? 'Completa nombre, rol y estatus' : 'Completa todos los campos');
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
          `Usuario creado. Cuando decidas, envíale la invitación con el botón de sobre en Acciones.`,
        );
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario');
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
      setNotice(`Invitación enviada a ${email} para establecer su contraseña.`);
    } catch {
      setNotice(`No se pudo enviar la invitación a ${email}. Intenta de nuevo.`);
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
          'ID de AppSheet (opcional, solo referencia histórica). El identificador de login lo genera Firebase.',
      },
      { label: 'Nombre', required: true, type: 'text', hint: 'Texto' },
      { label: 'Correo', required: true, type: 'text', hint: 'Correo electrónico único' },
      {
        label: 'Rol',
        required: true,
        type: 'ref',
        options: roles.rows
          .map((r) => String(r.name ?? ''))
          .filter((n) => n !== '')
          .sort((a, b) => a.localeCompare(b)),
        hint: 'Nombre del rol tal como existe en el app (usa el desplegable)',
      },
      {
        label: 'Estatus',
        required: false,
        type: 'text',
        options: [...USER_STATUS],
        hint: 'ACTIVO/INACTIVO o TRUE/FALSE de AppSheet (vacío = ACTIVO)',
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
      throw new Error(`"${email}" no es un correo válido — la cuenta necesita un correo real`);
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
            placeholder="Buscar usuarios…"
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
            title="Descargar plantilla Excel de usuarios"
            onClick={() => void handleTemplate()}
          >
            <FileDown size={16} />
            Plantilla
          </button>
          {can('users', 'crear') ? (
            <button
              type="button"
              className="btn btn-outline"
              title="Importar usuarios desde CSV (crea sus cuentas, sin enviar correos)"
              onClick={() => setImportOpen(true)}
            >
              <FileUp size={16} />
              Importar CSV
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={handleExport}>
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
          {can('users', 'crear') ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              Agregar usuario
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
        detailLabel="Enviar invitación para establecer contraseña"
        onDetail={(row) => void handleSendInvite(row)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />
      <Pagination page={safePage} total={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />
      <p className="usuarios-hint">
        Para dar de baja a alguien cámbialo a estatus INACTIVO: ya no podrá iniciar sesión. El
        botón de la izquierda en Acciones envía la invitación para establecer contraseña — no se
        envía ningún correo hasta que tú lo presiones.
      </p>

      {importOpen ? (
        <ImportCsvModal
          title="Usuarios"
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
        title={editing ? 'Editar usuario' : 'Agregar usuario'}
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
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="usuarios-layout">
        <div className="usuarios-form">
          <div className="field">
            <label className="field-label">
              Nombre<span className="field-required">*</span>
            </label>
            <input
              className={`field-input ${invalid && !form.name.trim() ? 'field-invalid' : ''}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label">
              Correo electrónico<span className="field-required">*</span>
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
              El usuario NO recibirá ningún correo al crearse. Cuando decidas, envíale la
              invitación con el botón de sobre en la tabla y le llegará el enlace para establecer
              su propia contraseña.
            </p>
          ) : null}
          <div className="field">
            <label className="field-label">
              Rol<span className="field-required">*</span>
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
              Estatus<span className="field-required">*</span>
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