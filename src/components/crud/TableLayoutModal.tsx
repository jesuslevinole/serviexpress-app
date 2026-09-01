import { useState, type DragEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useUiConfig } from '../../hooks/useUiConfig';
import {
  countDocumentsHavingField,
  removeFieldFromDocuments,
} from '../../services/firestoreService';
import type { CustomFieldDef, FieldOverride } from '../../context/uiConfigContext';
import type { ModuleConfig } from '../../types/models';
import './TableLayoutModal.css';

interface TableLayoutModalProps {
  /** Configuración BASE del módulo (sin overrides). */
  base: ModuleConfig;
  /** Editar el layout del DETALLE en vez del módulo. */
  target?: 'module' | 'detail';
  onClose: () => void;
}

interface EditableField {
  key: string;
  baseLabel: string;
  label: string;
  required: boolean;
  /** Visible en general: apagado = NADIE lo ve (ni el admin), en ningún lado. */
  visibleAll: boolean;
  /** Visible para los DEMÁS usuarios: apagado = solo los admins lo ven. */
  visibleOthers: boolean;
  /** Los calculados no pueden ser obligatorios (nadie los captura). */
  computed: boolean;
  /** Definición si es un campo agregado por el admin (eliminable). */
  custom: CustomFieldDef | null;
}

const CUSTOM_TYPES: { value: CustomFieldDef['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'bool', label: 'Yes / No' },
];

/** Clave física única para un campo nuevo ("cf_placa_x3f9"). */
function customKey(label: string): string {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return `cf_${slug}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Editor de layout del admin: renombrar, ORDENAR ARRASTRANDO, mostrar u
 * ocultar (en general o solo para los demás usuarios), marcar obligatorios,
 * y AGREGAR o ELIMINAR campos propios que viven en la colección. Todo aplica
 * a la tabla, el formulario, el exporte y la plantilla, para todos.
 */
export function TableLayoutModal({ base, target = 'module', onClose }: TableLayoutModalProps) {
  const { overrides, saveModuleOverride, saveError } = useUiConfig();
  const isDetail = target === 'detail' && base.detail !== undefined;
  const overrideId = isDetail ? `${base.id}__detail` : base.id;
  const baseTitle = isDetail ? base.detail!.title : base.title;
  const baseFields = isDetail ? base.detail!.fields : base.fields;
  const current = overrides.modules[overrideId];

  const buildRows = (): EditableField[] => {
    const fromBase = baseFields
      // Los campos internos (ni tabla ni formulario en el código) no se tocan.
      .filter((field) => !(field.form === false && field.table === false && !field.compute))
      .map((field) => ({
        key: field.key,
        baseLabel: field.label,
        computed: field.compute !== undefined || field.form === false,
        custom: null as CustomFieldDef | null,
      }));
    const fromCustom = (current?.customFields ?? []).map((def) => ({
      key: def.key,
      baseLabel: def.label,
      computed: false,
      custom: def,
    }));
    return [...fromBase, ...fromCustom]
      .map((item, index) => {
        const override = current?.fields?.[item.key];
        const baseField = baseFields.find((f) => f.key === item.key);
        return {
          ...item,
          label: override?.label ?? item.baseLabel,
          required: override?.required ?? baseField?.required === true,
          visibleAll:
            override?.hidden === true
              ? false
              : (override?.table ?? (baseField ? baseField.table !== false : true)),
          visibleOthers: override?.adminOnly !== true,
          order: override?.order ?? index,
        };
      })
      .sort((a, b) => a.order - b.order)
      .map(({ key, baseLabel, label, required, visibleAll, visibleOthers, computed, custom }) => ({
        key,
        baseLabel,
        label,
        required,
        visibleAll,
        visibleOthers,
        computed,
        custom,
      }));
  };

  const [title, setTitle] = useState(current?.title ?? baseTitle);
  const [rows, setRows] = useState<EditableField[]>(buildRows);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  /** Índice que se está arrastrando (drag & drop del orden). */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** Alta de campo nuevo. */
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomFieldDef['type']>('text');
  /** Confirmación de borrado de un campo con datos. */
  const [removing, setRemoving] = useState<{ row: EditableField; count: number } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /** Reordena en vivo mientras se arrastra sobre otra fila. */
  const handleDragOver = (event: DragEvent, overIndex: number) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(overIndex, 0, moved);
      return next;
    });
    setDragIndex(overIndex);
  };

  const update = (index: number, patch: Partial<EditableField>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addCustomField = () => {
    const label = newLabel.trim();
    if (label === '') return;
    const def: CustomFieldDef = { key: customKey(label), label, type: newType };
    setRows((prev) => [
      ...prev,
      {
        key: def.key,
        baseLabel: label,
        label,
        required: false,
        visibleAll: true,
        visibleOthers: true,
        computed: false,
        custom: def,
      },
    ]);
    setNewLabel('');
  };

  /** Quitar un campo propio: si ya tiene datos guardados, se pregunta antes. */
  const askRemove = async (row: EditableField) => {
    if (!row.custom) return;
    const existedBefore = (current?.customFields ?? []).some((def) => def.key === row.key);
    if (!existedBefore) {
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      return;
    }
    setBusy(true);
    setFailed(null);
    try {
      const collection = isDetail ? base.detail!.collection : base.collection;
      const count = await countDocumentsHavingField(collection, row.key);
      if (count === 0) {
        setRows((prev) => prev.filter((r) => r.key !== row.key));
      } else {
        setRemoving({ row, count });
      }
    } catch (error) {
      setFailed(
        error instanceof Error ? `Could not check the field's data: ${error.message}` : 'Error',
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async (deleteData: boolean) => {
    if (!removing) return;
    setRemoveBusy(true);
    setFailed(null);
    try {
      if (deleteData) {
        const collection = isDetail ? base.detail!.collection : base.collection;
        await removeFieldFromDocuments(collection, removing.row.key);
      }
      setRows((prev) => prev.filter((r) => r.key !== removing.row.key));
      setRemoving(null);
    } catch (error) {
      setFailed(
        error instanceof Error ? `The field could not be removed: ${error.message}` : 'Error',
      );
    } finally {
      setRemoveBusy(false);
    }
  };

  const handleReset = () => {
    setTitle(baseTitle);
    setRows(
      baseFields
        .filter((f) => !(f.form === false && f.table === false && !f.compute))
        .map((f) => ({
          key: f.key,
          baseLabel: f.label,
          label: f.label,
          required: f.required === true,
          visibleAll: f.table !== false,
          visibleOthers: true,
          computed: f.compute !== undefined || f.form === false,
          custom: null,
        })),
    );
  };

  const handleSave = async () => {
    setBusy(true);
    setFailed(null);
    const fields: Record<string, FieldOverride> = {};
    rows.forEach((row, index) => {
      fields[row.key] = {
        order: index,
        required: row.required,
        // Visible general apagado = oculto para TODOS, en tabla y formulario.
        hidden: !row.visibleAll,
        table: row.visibleAll,
        adminOnly: !row.visibleOthers,
        ...(row.label.trim() !== '' && row.label !== row.baseLabel
          ? { label: row.label.trim() }
          : {}),
      };
    });
    try {
      await saveModuleOverride(overrideId, {
        title: title.trim() !== '' && title !== baseTitle ? title.trim() : baseTitle,
        fields,
        customFields: rows.filter((row) => row.custom !== null).map((row) => row.custom!),
      });
      onClose();
    } catch (error) {
      setFailed(
        error instanceof Error
          ? `It could not be saved: ${error.message}`
          : 'It could not be saved. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Edit layout · ${baseTitle}`}
      onClose={onClose}
      size="md"
      layer="top"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={handleReset} disabled={busy}>
            <RotateCcw size={14} />
            Reset to default
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="tlayout">
        {failed ?? saveError ? <p className="tlayout-error">{failed ?? saveError}</p> : null}
        <div className="tlayout-title">
          <label>Module title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <p className="tlayout-hint">
          Drag the <GripVertical size={12} /> handle to reorder. <strong>Show</strong> off = the
          field disappears for EVERYONE (you included), everywhere. <strong>Others</strong> off =
          only admins see it. Everything applies to the table, the form, the Excel export and the
          template.
        </p>
        <div className="tlayout-legend">
          <span className="tlayout-legend-grow">Header</span>
          <span>Show</span>
          <span>Others</span>
          <span>Req</span>
        </div>
        <ul className="tlayout-list">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className={dragIndex === index ? 'is-dragging' : ''}
              onDragOver={(e) => handleDragOver(e, index)}
            >
              <span
                className="tlayout-grip"
                title="Drag to reorder"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
              >
                <GripVertical size={15} />
              </span>
              <span className="tlayout-pos">{index + 1}</span>
              <input value={row.label} onChange={(e) => update(index, { label: e.target.value })} />
              {row.custom ? <span className="tlayout-custom-tag">{row.custom.type}</span> : null}
              <label
                className="tlayout-required"
                title="Show off: nobody sees this field (you included), anywhere"
              >
                <input
                  type="checkbox"
                  checked={row.visibleAll}
                  onChange={() => update(index, { visibleAll: !row.visibleAll })}
                />
                <Eye size={13} />
              </label>
              <label
                className={`tlayout-required ${!row.visibleAll ? 'is-disabled' : ''}`}
                title="Others off: only admins see this field"
              >
                <input
                  type="checkbox"
                  checked={row.visibleOthers}
                  disabled={!row.visibleAll}
                  onChange={() => update(index, { visibleOthers: !row.visibleOthers })}
                />
                <EyeOff size={13} />
              </label>
              <label
                className={`tlayout-required ${row.computed ? 'is-disabled' : ''}`}
                title={row.computed ? 'System field' : 'Required in the form'}
              >
                <input
                  type="checkbox"
                  checked={row.required}
                  disabled={row.computed}
                  onChange={() => update(index, { required: !row.required })}
                />
                Req
              </label>
              <button
                type="button"
                className="icon-btn"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label="Move up"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Move down"
              >
                <ArrowDown size={15} />
              </button>
              {row.custom ? (
                <button
                  type="button"
                  className="icon-btn tlayout-remove"
                  title="Remove this field (asks first if it already has data)"
                  disabled={busy}
                  onClick={() => void askRemove(row)}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {!isDetail ? (
          <div className="tlayout-add">
            <span className="tlayout-add-title">Add a field to this module</span>
            <div className="tlayout-add-row">
              <input
                placeholder="Field name (e.g. Plate color)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as CustomFieldDef['type'])}
              >
                {CUSTOM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-outline"
                disabled={newLabel.trim() === ''}
                onClick={addCustomField}
              >
                <Plus size={15} />
                Add field
              </button>
            </div>
            <small>
              The new field appears in the form, the table and the exports, and its values are
              saved in every record of this module.
            </small>
          </div>
        ) : null}

        {removing ? (
          <div className="tlayout-confirm">
            <p>
              <strong>“{removing.row.label}”</strong> already has data in{' '}
              <strong>{removing.count}</strong> record{removing.count === 1 ? '' : 's'}. What do you
              want to do?
            </p>
            <div className="tlayout-confirm-actions">
              <button
                type="button"
                className="btn btn-danger"
                disabled={removeBusy}
                onClick={() => void confirmRemove(true)}
              >
                {removeBusy ? 'Removing…' : `Remove field AND delete its data (${removing.count})`}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={removeBusy}
                onClick={() => void confirmRemove(false)}
              >
                Remove from the app, keep the data
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={removeBusy}
                onClick={() => setRemoving(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
