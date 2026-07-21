import { useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useUiConfig } from '../../hooks/useUiConfig';
import type { FieldOverride } from '../../context/uiConfigContext';
import type { ModuleConfig } from '../../types/models';
import './TableLayoutModal.css';

interface TableLayoutModalProps {
  /** Configuración BASE del módulo (sin overrides). */
  base: ModuleConfig;
  onClose: () => void;
}

interface EditableField {
  key: string;
  baseLabel: string;
  label: string;
}

/**
 * Admin editor: rename the module title and every column header, and
 * reorder the columns. Changes persist for everyone.
 */
export function TableLayoutModal({ base, onClose }: TableLayoutModalProps) {
  const { overrides, saveModuleOverride } = useUiConfig();
  const current = overrides.modules[base.id];

  const initialFields: EditableField[] = base.fields
    .map((field, index) => ({
      key: field.key,
      baseLabel: field.label,
      label: current?.fields?.[field.key]?.label ?? field.label,
      order: current?.fields?.[field.key]?.order ?? index,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ key, baseLabel, label }) => ({ key, baseLabel, label }));

  const [title, setTitle] = useState(current?.title ?? base.title);
  const [rows, setRows] = useState<EditableField[]>(initialFields);
  const [busy, setBusy] = useState(false);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const rename = (index: number, label: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, label } : row)));
  };

  const handleReset = () => {
    setTitle(base.title);
    setRows(base.fields.map((f) => ({ key: f.key, baseLabel: f.label, label: f.label })));
  };

  const handleSave = async () => {
    setBusy(true);
    const fields: Record<string, FieldOverride> = {};
    rows.forEach((row, index) => {
      fields[row.key] = {
        order: index,
        ...(row.label.trim() !== '' && row.label !== row.baseLabel
          ? { label: row.label.trim() }
          : {}),
      };
    });
    await saveModuleOverride(base.id, {
      title: title.trim() !== '' && title !== base.title ? title.trim() : base.title,
      fields,
    });
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open
      title={`Edit layout · ${base.title}`}
      onClose={onClose}
      size="md"
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
        <div className="tlayout-title">
          <label>Module title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <p className="tlayout-hint">
          Rename headers and reorder columns. The order applies to the table, the form, the Excel
          export and the template.
        </p>
        <ul className="tlayout-list">
          {rows.map((row, index) => (
            <li key={row.key}>
              <span className="tlayout-pos">{index + 1}</span>
              <input value={row.label} onChange={(e) => rename(index, e.target.value)} />
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
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
