import { useMemo, useState } from 'react';
import { FileSpreadsheet, MailPlus, Plus, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { COLLECTIONS } from '../config/collections';
import { USER_STATUS } from '../config/enums';
import { createUserWithProfile, sendSetPasswordEmail } from '../services/userService';
import { updateDocument } from '../services/firestoreService';
import { exportToExcel } from '../services/excelExport';
import { Badge } from '../components/ui/Badge';
import { SaveSummary } from '../components/crud/SaveSummary';
import { DataTable, type TableColumn } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Spinner } from '../components/ui/Spinner';
import type { EntityData, FieldConfig } from '../types/models';
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

/** Campos que muestra el sumario lateral del modal de usuarios. */
const USER_SUMMARY_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Nombre', type: 'text' },
  { key: 'email', label: 'Correo', type: 'text' },
  { key: 'status', label: 'Estatus', type: 'text' },
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
  const [sessionIds, setSessionIds] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

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
        setSessionIds((prev) => new Set(prev).add(editing.id));
        setNotice(null);
      } else {
        const email = form.email.trim();
        const uid = await createUserWithProfile({
          name: form.name.trim(),
          email,
          roleId: form.roleId,
          status: form.status,
        });
        setSessionIds((prev) => new Set(prev).add(uid));
        setNotice(
          `Usuario creado. Se envió un correo a ${email} para que establezca su contraseña.`,
        );
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario');
    } finally {
      setBusy(false);
    }
  };

  /** Reenvía el correo para establecer contraseña (por si expiró o no llegó). */
  const handleResendEmail = async (row: EntityData) => {
    const email = String(row.email ?? '');
    if (!email) return;
    try {
      await sendSetPasswordEmail(email);
      setNotice(`Se reenvió el correo para establecer contraseña a ${email}.`);
    } catch {
      setNotice(`No se pudo enviar el correo a ${email}. Intenta de nuevo.`);
    }
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="crud-toolbar-actions">
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
        rows={filtered}
        canEdit={can('users', 'editar')}
        canDelete={false}
        onEdit={openEdit}
        detailLabel="Reenviar correo de contraseña"
        onDetail={(row) => void handleResendEmail(row)}
      />
      <p className="usuarios-hint">
        Para dar de baja a alguien cámbialo a estatus INACTIVO: ya no podrá iniciar sesión. El
        botón de la izquierda en Acciones reenvía el correo para establecer contraseña.
      </p>

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
              El usuario recibirá un correo en esa dirección con un enlace para establecer su
              propia contraseña. Nadie más la conoce.
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
          rows={users.rows}
          refLabels={() => '—'}
          sessionIds={sessionIds}
        />
        </div>
      </Modal>
    </div>
  );
}