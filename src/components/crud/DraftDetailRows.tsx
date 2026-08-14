import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '../ui/FormField';
import { displayCell } from './displayValue';
import { useCollection } from '../../hooks/useCollection';
import type { SelectOption } from '../ui/SearchableSelect';
import type { RefMaps } from '../../hooks/useRefMaps';
import type { DetailConfig, EntityData, FieldConfig, FieldValue } from '../../types/models';
import './DraftDetailRows.css';

export type DraftRow = Record<string, FieldValue>;

interface DraftDetailRowsProps {
  detail: DetailConfig;
  rows: DraftRow[];
  refMaps: RefMaps;
  refLabels: (collection: string, id: string) => string;
  onChange: (rows: DraftRow[]) => void;
}

/** Suma la cantidad de las filas que coinciden en los campos que identifican el artículo. */
function sumMatching(
  rows: EntityData[] | DraftRow[],
  matchKeys: string[],
  quantityKey: string,
  target: DraftRow,
): number {
  return (rows as DraftRow[]).reduce((total, row) => {
    const same = matchKeys.every((key) => row[key] === target[key]);
    if (!same) return total;
    const value = row[quantityKey];
    return total + (typeof value === 'number' ? value : Number(value) || 0);
  }, 0);
}

/**
 * Subtabla de renglones capturados ANTES de que exista el registro maestro.
 * Se usa en el alta: las filas viven en memoria y el módulo las guarda en
 * cuanto crea el maestro, para no obligar a guardar y volver a entrar.
 */
export function DraftDetailRows({
  detail,
  rows,
  refMaps,
  refLabels,
  onChange,
}: DraftDetailRowsProps) {
  const fields = useMemo(
    () =>
      detail.fields.filter(
        (field) => field.form !== false && field.compute === undefined && !field.fixedOnCreate,
      ),
    [detail.fields],
  );

  const blank = useMemo(() => {
    const values: DraftRow = {};
    fields.forEach((field) => {
      values[field.key] =
        field.defaultValue !== undefined
          ? field.defaultValue
          : field.type === 'number' || field.type === 'currency'
            ? null
            : '';
    });
    return values;
  }, [fields]);

  const [draft, setDraft] = useState<DraftRow>(blank);
  const [error, setError] = useState<string | null>(null);

  // Existencia: entradas menos lo ya entregado, menos lo que va en esta captura.
  const control = detail.stockControl;
  const entries = useCollection(control?.entriesCollection ?? '');
  const exits = useCollection(control ? detail.collection : '');

  const available = useMemo(() => {
    if (!control) return null;
    const ready = control.matchKeys.every((key) => {
      const value = draft[key];
      return typeof value === 'string' && value !== '';
    });
    if (!ready) return null;
    const totalIn = sumMatching(entries.rows, control.matchKeys, control.quantityKey, draft);
    const totalOut = sumMatching(exits.rows, control.matchKeys, control.quantityKey, draft);
    const inDraft = sumMatching(rows, control.matchKeys, control.quantityKey, draft);
    return totalIn - totalOut - inDraft;
  }, [control, draft, entries.rows, exits.rows, rows]);

  const refOptions = (field: FieldConfig): SelectOption[] => {
    if (field.type !== 'ref' || !field.refCollection) return [];
    const data = refMaps[field.refCollection];
    if (!data) return [];
    let options = [...data.labels.entries()].map(([value, label]) => ({ value, label }));
    // Tallas del tipo que usa la prenda elegida (mismo filtro del subformulario).
    const filter = field.refFilterFromRefField;
    if (filter) {
      const sourceField = detail.fields.find((f) => f.key === filter.field);
      const sourceId = draft[filter.field];
      if (sourceField?.refCollection && typeof sourceId === 'string' && sourceId !== '') {
        const source = refMaps[sourceField.refCollection]?.rows.find((r) => r.id === sourceId);
        const expected = source?.[filter.sourceField];
        if (expected !== undefined && expected !== '') {
          const allowed = new Set(
            data.rows.filter((r) => r[filter.targetField] === expected).map((r) => r.id),
          );
          options = options.filter((option) => allowed.has(option.value));
        }
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  };

  const handleAdd = () => {
    const missing = fields.filter(
      (field) => field.required && (draft[field.key] === '' || draft[field.key] === null),
    );
    if (missing.length > 0) {
      setError(`Fill in ${missing.map((f) => f.label).join(', ')} before adding the line.`);
      return;
    }
    if (control && available !== null) {
      const value = draft[control.quantityKey];
      const requested = typeof value === 'number' ? value : Number(value) || 0;
      if (requested > available) {
        setError(
          available <= 0
            ? 'There is no stock of this uniform and size. Register it first in Uniform inventory, with the “Add stock” button.'
            : `Not enough stock: only ${available} available. Lower the quantity, or register more in Uniform inventory.`,
        );
        return;
      }
    }
    setError(null);
    onChange([...rows, draft]);
    setDraft(blank);
  };

  return (
    <section className="draftrows">
      <header className="draftrows-head">
        <strong>{detail.title}</strong>
        <span>{rows.length === 0 ? 'No lines yet' : `${rows.length} line(s)`}</span>
      </header>

      <div className="draftrows-form">
        {fields.map((field) => (
          <FormField
            key={field.key}
            field={field}
            value={draft[field.key] ?? null}
            invalid={false}
            refOptions={refOptions(field)}
            onChange={(key, value) =>
              setDraft((prev) => {
                const next = { ...prev, [key]: value };
                // Al cambiar la prenda, la talla elegida puede dejar de aplicar.
                detail.fields.forEach((f) => {
                  if (f.refFilterFromRefField?.field === key) next[f.key] = '';
                });
                return next;
              })
            }
          />
        ))}
        <button type="button" className="btn btn-outline draftrows-add" onClick={handleAdd}>
          <Plus size={16} />
          Add line
        </button>
      </div>

      {control && available !== null ? (
        <p className={`draftrows-stock ${available <= 0 ? 'is-empty' : ''}`}>
          {available} available in stock
        </p>
      ) : null}
      {error ? <p className="draftrows-error">{error}</p> : null}

      {rows.length > 0 ? (
        <ul className="draftrows-list">
          {rows.map((row, index) => (
            <li key={index}>
              <span>
                {fields
                  .map((field) => displayCell(field, { id: '', ...row }, refLabels))
                  .filter((text) => text !== '—')
                  .join(' · ')}
              </span>
              <button
                type="button"
                className="draftrows-remove"
                aria-label="Remove line"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
