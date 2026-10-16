import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useCollection } from '../../hooks/useCollection';
import { COLLECTIONS } from '../../config/collections';
import {
  EMPTY_NOTIFY_CONFIG,
  saveModuleNotifyConfig,
  subscribeModuleNotifyConfig,
  type ModuleNotifyConfig,
  type NotifyRule,
} from '../../services/emailNotifications';
import type { ModuleConfig } from '../../types/models';
import './EmailRecipientsModal.css';

interface EmailRecipientsModalProps {
  /** Configuración del módulo: de ahí salen los campos que viajan al correo. */
  module: ModuleConfig;
  byUid: string | null;
  onClose: () => void;
}

/**
 * "Automatic emails" (solo admin): quién recibe correo de ESTA vista y ante
 * qué evento. El envío lo hace el servidor al escribirse el registro, así
 * que el aviso sale aunque quien capturó cierre la pestaña.
 */
export function EmailRecipientsModal({ module, byUid, onClose }: EmailRecipientsModalProps) {
  const { rows: users } = useCollection(COLLECTIONS.users);
  const [config, setConfig] = useState<ModuleNotifyConfig>(EMPTY_NOTIFY_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    return subscribeModuleNotifyConfig(
      module.id,
      (saved) => {
        if (saved) setConfig(saved);
        setLoaded(true);
      },
      (message) => setError(`No se pudo leer la configuración: ${message}`),
    );
  }, [module.id]);

  /** Campos con lista de valores: los únicos que sirven para una regla. */
  const ruleFields = useMemo(
    () => module.fields.filter((field) => (field.enumValues?.length ?? 0) > 0),
    [module.fields],
  );

  const sorted = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...users]
      .map((user) => ({
        id: user.id,
        name: typeof user.name === 'string' && user.name !== '' ? user.name : '(sin nombre)',
        email: typeof user.email === 'string' ? user.email : '',
      }))
      .filter(
        (user) =>
          needle === '' ||
          user.name.toLowerCase().includes(needle) ||
          user.email.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search]);

  const patch = (changes: Partial<ModuleNotifyConfig>) =>
    setConfig((prev) => ({ ...prev, ...changes }));

  const toggleUser = (id: string) =>
    setConfig((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(id)
        ? prev.userIds.filter((item) => item !== id)
        : [...prev.userIds, id],
    }));

  const addRule = () => {
    const field = ruleFields[0];
    if (!field) return;
    const value = field.enumValues?.[0] ?? '';
    const rule: NotifyRule = {
      field: field.key,
      to: value,
      label: `${field.label}: ${value}`,
    };
    patch({ rules: [...config.rules, rule] });
  };

  const updateRule = (index: number, changes: Partial<NotifyRule>) =>
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) => {
        if (i !== index) return rule;
        const next = { ...rule, ...changes };
        const field = module.fields.find((item) => item.key === next.field);
        // La etiqueta es lo que se lee en el asunto del correo.
        return { ...next, label: `${field?.label ?? next.field}: ${next.to}` };
      }),
    }));

  const removeRule = (index: number) =>
    patch({ rules: config.rules.filter((_, i) => i !== index) });

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveModuleNotifyConfig(module, config, byUid);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? `No se pudo guardar: ${err.message}` : 'Save error');
    } finally {
      setBusy(false);
    }
  };

  const nobody = config.userIds.length === 0 && !config.notifyOwner;

  return (
    <Modal
      open
      title={`Automatic emails · ${module.title}`}
      onClose={onClose}
      size="full"
      layer="top"
      footer={
        <>
          {error ? <span className="mailrec-error">{error}</span> : null}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={busy || !loaded}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="mailrec">
        <p className="mailrec-hint">
          Los usuarios marcados reciben un correo <strong>automático</strong> cuando pasa lo que
          elijas aquí abajo. Lo envía el servidor al guardarse el registro, así que llega aunque
          quien capturó cierre la pestaña o el registro entre por una importación. Sin nadie
          marcado no se envía nada.
        </p>

        <section className="mailrec-block">
          <h3>Cuándo avisar</h3>
          <label className="mailrec-toggle">
            <input
              type="checkbox"
              checked={config.onCreate}
              onChange={() => patch({ onCreate: !config.onCreate })}
            />
            Al <strong>crear</strong> un registro
          </label>
          <label className="mailrec-toggle">
            <input
              type="checkbox"
              checked={config.onEdit}
              onChange={() => patch({ onEdit: !config.onEdit })}
            />
            Al <strong>editar</strong> cualquier campo
          </label>

          <div className="mailrec-rules">
            <div className="mailrec-rules-head">
              <span>
                Y además, cuando un campo cambie a un valor concreto —{' '}
                <em>por ejemplo, Status a APROBADO</em>. Estas reglas avisan aunque lo de arriba
                esté apagado.
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={addRule}
                disabled={ruleFields.length === 0}
                title={
                  ruleFields.length === 0
                    ? 'Este módulo no tiene campos con lista de valores'
                    : 'Agregar una regla'
                }
              >
                <Plus size={15} />
                Agregar regla
              </button>
            </div>
            {config.rules.map((rule, index) => {
              const field = module.fields.find((item) => item.key === rule.field);
              return (
                <div className="mailrec-rule" key={`${rule.field}-${index}`}>
                  <span>Cuando</span>
                  <select
                    value={rule.field}
                    onChange={(event) => {
                      const next = module.fields.find((item) => item.key === event.target.value);
                      updateRule(index, {
                        field: event.target.value,
                        to: next?.enumValues?.[0] ?? '',
                      });
                    }}
                  >
                    {ruleFields.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span>pase a</span>
                  <select
                    value={rule.to}
                    onChange={(event) => updateRule(index, { to: event.target.value })}
                  >
                    {(field?.enumValues ?? [rule.to]).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Quitar la regla"
                    onClick={() => removeRule(index)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            {config.rules.length === 0 ? (
              <p className="mailrec-empty">Sin reglas: solo avisa lo marcado arriba.</p>
            ) : null}
          </div>
        </section>

        <section className="mailrec-block">
          <h3>A quién</h3>
          {module.autoUserField ? (
            <label className="mailrec-toggle">
              <input
                type="checkbox"
                checked={config.notifyOwner}
                onChange={() => patch({ notifyOwner: !config.notifyOwner })}
              />
              También a <strong>quien capturó</strong> el registro
            </label>
          ) : null}
          <input
            className="mailrec-search"
            type="text"
            placeholder="Buscar usuario…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ul className="mailrec-list">
            {sorted.map((user) => (
              <li key={user.id}>
                <label className={user.email === '' ? 'is-disabled' : ''}>
                  <input
                    type="checkbox"
                    checked={config.userIds.includes(user.id)}
                    disabled={user.email === ''}
                    onChange={() => toggleUser(user.id)}
                  />
                  <span className="mailrec-name">{user.name}</span>
                  <span className="mailrec-email">
                    {user.email === '' ? 'sin correo' : user.email}
                  </span>
                </label>
              </li>
            ))}
            {sorted.length === 0 ? <li className="mailrec-empty">No hay usuarios</li> : null}
          </ul>
          <p className={`mailrec-count ${nobody ? 'is-warning' : ''}`}>
            {nobody
              ? 'Nadie seleccionado: esta vista no enviará ningún correo.'
              : `${config.userIds.length} destinatario${config.userIds.length === 1 ? '' : 's'}${
                  config.notifyOwner ? ' + quien capturó' : ''
                }`}
          </p>
        </section>
      </div>
    </Modal>
  );
}
