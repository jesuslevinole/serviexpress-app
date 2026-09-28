import { useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { PERMISSION_MODULES } from '../config/modules';
import { COLLECTIONS } from '../config/collections';
import { updateDocument } from '../services/firestoreService';
import type { EntityData, PermissionAction } from '../types/models';
import './UserAccessModal.css';

interface UserAccessModalProps {
  user: EntityData;
  roleName: string;
  onClose: () => void;
}

/** Acciones que tiene sentido adelantar a una persona concreta. */
const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'ver', label: 'View' },
  { key: 'crear', label: 'Create' },
  { key: 'editar', label: 'Edit' },
  { key: 'eliminar', label: 'Delete' },
  { key: 'exportar', label: 'Export' },
  { key: 'verHistorico', label: 'Historic tab' },
];

type Overrides = Record<string, Partial<Record<PermissionAction, boolean>>>;

/**
 * Accesos EXTRA de una persona, además de su rol. Se usa para adelantarle
 * una vista a alguien puntual (p. ej. dos BC que ya trabajan con Fleet
 * Report) sin tocar el rol del resto. Nunca quita lo que el rol ya concede.
 */
export function UserAccessModal({ user, roleName, onClose }: UserAccessModalProps) {
  const initial = useMemo<Overrides>(() => {
    const raw = user.permissionOverrides;
    return raw && typeof raw === 'object' ? ({ ...raw } as Overrides) : {};
  }, [user.permissionOverrides]);
  const [overrides, setOverrides] = useState<Overrides>(initial);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const modules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === '') return PERMISSION_MODULES;
    return PERMISSION_MODULES.filter((module) => module.title.toLowerCase().includes(term));
  }, [search]);

  const granted = useMemo(
    () =>
      Object.values(overrides).reduce(
        (total, actions) => total + Object.values(actions).filter(Boolean).length,
        0,
      ),
    [overrides],
  );

  const toggle = (moduleId: string, action: PermissionAction) => {
    setSaved(false);
    setOverrides((prev) => {
      const next: Overrides = { ...prev, [moduleId]: { ...(prev[moduleId] ?? {}) } };
      if (next[moduleId][action]) delete next[moduleId][action];
      else next[moduleId][action] = true;
      if (Object.keys(next[moduleId]).length === 0) delete next[moduleId];
      return next;
    });
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateDocument(COLLECTIONS.users, user.id, { permissionOverrides: overrides });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? `It could not be saved: ${err.message}` : 'Save error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Extra access · ${String(user.name ?? '')}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save access'}
          </button>
        </>
      }
    >
      <div className="uaccess">
        <p className="uaccess-hint">
          <KeyRound size={14} /> These permissions are given to <strong>this person only</strong>,
          on top of the role <strong>{roleName}</strong>. Use it to give someone a module early
          without changing the role of everyone else. It never takes away what the role already
          grants — to remove something, change the role.
        </p>
        {error ? <p className="uaccess-error">{error}</p> : null}
        {saved ? <p className="uaccess-saved">Saved. The person sees it on their next load.</p> : null}
        <input
          className="field-input uaccess-search"
          placeholder="Search module…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="uaccess-scroll">
          <table className="uaccess-table">
            <thead>
              <tr>
                <th>Module</th>
                {ACTIONS.map((action) => (
                  <th key={action.key}>{action.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id}>
                  <td className="uaccess-module">{module.title}</td>
                  {ACTIONS.map((action) => (
                    <td key={action.key}>
                      <input
                        type="checkbox"
                        checked={overrides[module.id]?.[action.key] === true}
                        onChange={() => toggle(module.id, action.key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="uaccess-count">{granted} extra permission{granted === 1 ? '' : 's'} granted</p>
      </div>
    </Modal>
  );
}
