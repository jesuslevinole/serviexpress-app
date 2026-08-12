import { Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { QuickAddRefModal } from '../ui/QuickAddRefModal';
import { catalogModules } from '../../config/modules';
import { useAuth } from '../../hooks/useAuth';
import { SaveSummary } from './SaveSummary';
import { displayCell, scalar } from './displayValue';
import type { SelectOption } from '../ui/SearchableSelect';
import type { RefMaps } from '../../hooks/useRefMaps';
import type { EntityData, FieldConfig, FieldValue } from '../../types/models';
import './CrudForm.css';

interface CrudFormProps {
  open: boolean;
  title: string;
  fields: FieldConfig[];
  initial: EntityData | null;
  refMaps: RefMaps;
  busy: boolean;
  error: string | null;
  /** Se incrementa cuando un "Guardar y agregar otro" fue exitoso: limpia el formulario. */
  resetSignal: number;
  /** Si se define, muestra el botón para configurar campos obligatorios (permiso Customization). */
  onConfigure?: () => void;
  /** Clave del campo capturista (idUsers) cuando el rol puede editarlo en el formulario. */
  editableCapturedByKey?: string;
  /** Uid del usuario actual: valor inicial del capturista en altas. */
  currentUid?: string | null;
  /** Valores iniciales extra en altas (p. ej. entidad/estación del usuario). */
  presetValues?: Record<string, FieldValue>;
  /** Contenido extra bajo el formulario (p. ej. los uniformes ya cargados). */
  extraSection?: ReactNode;
  /** Aviso en vivo que depende de lo capturado (p. ej. existencia disponible). */
  renderBanner?: (values: Record<string, FieldValue>) => ReactNode;
  /** Alcance (entidad/estación) por usuario, para rellenar al elegir capturista. */
  userScopes?: Record<string, { entity: string | null; station: string | null }>;
  /** Si el rol NO puede editar Entity/Station, esos campos se muestran bloqueados. */
  contextEditable?: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, FieldValue>, keepOpen: boolean) => void;
}

function buildInitialValues(fields: FieldConfig[], initial: EntityData | null) {
  const values: Record<string, FieldValue> = {};
  fields.forEach((field) => {
    if (initial && field.key in initial) {
      values[field.key] = scalar(initial[field.key]);
    } else if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue;
    } else if (field.type === 'bool') {
      values[field.key] = false;
    } else if (field.type === 'date' && field.required) {
      values[field.key] = new Date().toISOString().slice(0, 10);
    } else {
      values[field.key] = field.type === 'number' || field.type === 'currency' ? null : '';
    }
  });
  return values;
}

function isEmpty(value: FieldValue): boolean {
  return value === null || value === '' || value === undefined;
}

/**
 * Formulario modal genérico: valida requeridos con resaltado rojo
 * y bloquea el guardado hasta que estén completos.
 */
export function CrudForm({
  open,
  title,
  fields,
  initial,
  refMaps,
  busy,
  error,
  resetSignal,
  onConfigure,
  editableCapturedByKey,
  currentUid,
  presetValues,
  userScopes,
  extraSection,
  renderBanner,
  contextEditable = true,
  onClose,
  onSubmit,
}: CrudFormProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [touchedSubmit, setTouchedSubmit] = useState(false);

  /** Campos que sí se capturan (los form:false los llena el sistema),
      más el capturista cuando el rol tiene permiso de editarlo. */
  /**
   * Campos que forman el registro guardado. Incluye los que no se muestran en
   * el alta (hideOnCreate) para que conserven su valor por omisión; excluye
   * los calculados, que no se persisten.
   */
  const valueFields = useMemo(() => fields.filter((f) => f.compute === undefined), [fields]);

  const formFields = useMemo(
    () =>
      fields.filter((f) => {
        if (f.compute) return false;
        if (f.form === false) return f.key === editableCapturedByKey;
        // Se pide solo al editar: en el alta toma su valor por omisión.
        if (f.hideOnCreate && initial === null) return false;
        return true;
      }),
    [fields, editableCapturedByKey, initial],
  );

  useEffect(() => {
    if (open) {
      const base = buildInitialValues(valueFields, initial);
      // Alta: las fechas de registro arrancan en el día de hoy.
      if (!initial) {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
          today.getDate(),
        ).padStart(2, '0')}`;
        valueFields.forEach((field) => {
          if (field.defaultToday && (base[field.key] === null || base[field.key] === '')) {
            base[field.key] = iso;
          }
        });
      }
      // Alta: el capturista arranca con los datos del usuario actual.
      if (!initial && editableCapturedByKey && currentUid) {
        base[editableCapturedByKey] = currentUid;
      }
      // Alta: valores del alcance del usuario (su entidad/estación).
      if (!initial && presetValues) {
        Object.entries(presetValues).forEach(([key, value]) => {
          if (value !== null && value !== '' && key in base && (base[key] === null || base[key] === '')) {
            base[key] = value;
          }
        });
      }
      setValues(base);
      setTouchedSubmit(false);
    }
  }, [open, valueFields, initial, resetSignal, editableCapturedByKey, currentUid, presetValues]);

  const refOptionsByField = useMemo(() => {
    const map: Record<string, SelectOption[]> = {};
    formFields.forEach((field) => {
      if (field.type !== 'ref' || !field.refCollection) return;
      const refData = refMaps[field.refCollection];
      if (!refData) {
        map[field.key] = [];
        return;
      }
      let rows = refData.rows;
      // Filtro fijo, o dependiente del valor actual de otro campo del formulario.
      let filter = field.refFilter;
      if (field.refFilterFromField) {
        const source = values[field.refFilterFromField.field];
        const mapped =
          typeof source === 'string' ? field.refFilterFromField.map[source] : undefined;
        filter = mapped ? { field: field.refFilterFromField.targetField, value: mapped } : undefined;
      }
      // Filtro tomado del registro referenciado por otro campo
      // (p. ej. las tallas del tipo que usa la prenda elegida).
      if (field.refFilterFromRefField) {
        const spec = field.refFilterFromRefField;
        const sourceField = fields.find((f) => f.key === spec.field);
        const sourceId = values[spec.field];
        const sourceRows =
          sourceField?.refCollection ? refMaps[sourceField.refCollection]?.rows : undefined;
        const sourceRow =
          typeof sourceId === 'string' ? sourceRows?.find((r) => r.id === sourceId) : undefined;
        const targetValue = sourceRow?.[spec.sourceField];
        filter =
          typeof targetValue === 'string' && targetValue !== ''
            ? { field: spec.targetField, value: targetValue }
            : undefined;
      }
      if (filter) {
        // Comparación sin distinguir mayúsculas: los datos migrados traen
        // "Scanner"/"Truck" y la configuración usa "SCANNER"/"TRUCK".
        const target = String(filter.value).toUpperCase();
        const filterKey = filter.field;
        rows = rows.filter((r) => String(r[filterKey] ?? '').toUpperCase() === target);
      }
      map[field.key] = rows
        .map((r) => ({ value: r.id, label: refData.labels.get(r.id) ?? r.id }))
        .sort((a, b) => a.label.localeCompare(b.label));
    });
    return map;
  }, [formFields, fields, refMaps, values]);

  /** Diferencia de millaje en vivo: Next mant − Actual Mileage. */
  const mileageDiff = useMemo(() => {
    const hasBoth = 'nextMant' in values && 'mileage' in values;
    if (!hasBoth) return null;
    const next = values.nextMant;
    const current = values.mileage;
    if (typeof next !== 'number' || typeof current !== 'number') return null;
    return next - current;
  }, [values]);

  /** Campos visibles según las condiciones (p. ej. tipo Preventive/Corrective). */
  const visibleFields = useMemo(
    () =>
      formFields.filter(
        (f) => !f.visibleWhen || values[f.visibleWhen.field] === f.visibleWhen.value,
      ),
    [formFields, values],
  );

  /** Un campo se muestra bloqueado si es de solo lectura, o si ya se fijó al crear. */
  const isLocked = (field: FieldConfig) =>
    field.readOnly === true ||
    field.fixedOnCreate === true ||
    (field.lockedAfterCreate === true && initial !== null);

  /**
   * Qué NO se reenvía al guardar. Un campo `fixedOnCreate` sí viaja en el alta
   * (es cuando el sistema lo fija); a partir de ahí queda intacto.
   */
  const isStripped = (field: FieldConfig) =>
    field.readOnly === true || (isLocked(field) && initial !== null);

  const missing = useMemo(
    () =>
      visibleFields
        .filter((f) => f.required && !isLocked(f) && isEmpty(values[f.key]))
        .map((f) => f.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleFields, values, initial],
  );

  const handleChange = (key: string, value: FieldValue) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Al elegir una referencia, se copian los datos que dependen de ella
      // (p. ej. el Next mant del camión seleccionado).
      if (typeof value === 'string' && value !== '') {
        const sourceField = fields.find((f) => f.key === key);
        const sourceRows = sourceField?.refCollection
          ? refMaps[sourceField.refCollection]?.rows
          : undefined;
        const sourceRow = sourceRows?.find((r) => r.id === value);
        if (sourceRow) {
          fields.forEach((target) => {
            if (target.copyFromRefField?.field !== key) return;
            const copied = sourceRow[target.copyFromRefField.sourceField];
            next[target.key] =
              typeof copied === 'number' || typeof copied === 'string' ? copied : null;
          });
        }
      }
      // Al cambiar el capturista, Entity/Station se rellenan con SU asignación.
      if (key === editableCapturedByKey && typeof value === 'string' && userScopes) {
        const scope = userScopes[value];
        if (scope) {
          fields.forEach((f) => {
            if (f.defaultFromUserScope === 'entity' && scope.entity) next[f.key] = scope.entity;
            if (f.defaultFromUserScope === 'station' && scope.station) next[f.key] = scope.station;
          });
        }
      }
      return next;
    });
  };

  /**
   * Alta rápida: un campo de referencia muestra "+" cuando apunta a un
   * catálogo y el rol puede crear en él. Al guardar, el nuevo registro llega
   * solo a las opciones (los catálogos van suscritos en vivo) y se selecciona.
   */
  const { can, isAdmin } = useAuth();
  const [quickAdd, setQuickAdd] = useState<FieldConfig | null>(null);

  const catalogFor = (field: FieldConfig) => {
    if (field.type !== 'ref' || !field.refCollection) return null;
    const catalog = catalogModules.find((module) => module.collection === field.refCollection);
    if (!catalog) return null;
    // Todos los catálogos se gobiernan con el permiso 'catalogs': es el id con
    // el que CatalogosPage monta el motor, y el único que existe en la matriz.
    if (!isAdmin && !can('catalogs', 'crear')) return null;
    return catalog;
  };

  const handleSubmit = (keepOpen: boolean) => {
    setTouchedSubmit(true);
    if (missing.length > 0) return;
    // Los campos de solo lectura los mantiene el sistema: no se reenvían para
    // no pisar un valor que pudo cambiar mientras el formulario estaba abierto.
    const payload = { ...values };
    fields.forEach((field) => {
      if (isStripped(field)) delete payload[field.key];
    });
    onSubmit(payload, keepOpen);
  };

  const refLabel = (collection: string, id: string): string =>
    refMaps[collection]?.labels.get(id) ?? '—';

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {error ? <span className="crudform-error">{error}</span> : null}
          {onConfigure ? (
            <button
              type="button"
              className="btn btn-outline crudform-config"
              title="Configure required fields, headers and order"
              onClick={onConfigure}
              disabled={busy}
            >
              <Settings2 size={15} />
              <span className="crud-btn-text">Required fields</span>
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {initial === null ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleSubmit(true)}
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save and add another'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSubmit(false)}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="crudform-layout">
        <div className="crudform-grid">
          {visibleFields.map((field) => {
            // Dato que mantiene el sistema (p. ej. el millaje actual del
            // camión): se muestra, pero no se captura.
            if (isLocked(field)) {
              return (
                <div key={field.key} className="crudform-locked">
                  <span className="crudform-locked-label">{field.label}</span>
                  <span
                    className="crudform-locked-value"
                    title={
                      field.readOnly
                        ? 'Kept up to date by the system'
                        : field.fixedOnCreate
                          ? 'Set automatically by the system and cannot be changed'
                          : 'Set when the record was created and cannot be changed'
                    }
                  >
                    {displayCell(field, { id: '', ...values }, refLabel)}
                  </span>
                </div>
              );
            }
            if (field.defaultFromUserScope !== undefined && !contextEditable) {
              const options = refOptionsByField[field.key] ?? [];
              const current = values[field.key];
              const label =
                options.find((o) => o.value === current)?.label ??
                (typeof current === 'string' && current !== '' ? current : '—');
              return (
                <div key={field.key} className="crudform-locked">
                  <span className="crudform-locked-label">{field.label}</span>
                  <span className="crudform-locked-value" title="Set from the capturing user's assignment">
                    {label}
                  </span>
                </div>
              );
            }
            return (
            <FormField
              key={field.key}
              field={field}
              value={values[field.key] ?? null}
              invalid={touchedSubmit && missing.includes(field.key)}
              refOptions={refOptionsByField[field.key] ?? []}
              onQuickAdd={catalogFor(field) ? () => setQuickAdd(field) : undefined}
              onChange={handleChange}
            />
            );
          })}
        </div>
        <SaveSummary fields={visibleFields} values={values} refLabels={refLabel} />
      </div>

      {mileageDiff !== null ? (
        <div className={`crudform-diff ${mileageDiff < 0 ? 'is-over' : ''}`}>
          <span>Difference mileage</span>
          <strong>{mileageDiff.toLocaleString('en-US')}</strong>
          <small>
            {mileageDiff < 0
              ? 'The truck is past its next maintenance'
              : 'Miles left before the next maintenance'}
          </small>
        </div>
      ) : null}

      {renderBanner ? <div className="crudform-banner">{renderBanner(values)}</div> : null}

      {extraSection ? <div className="crudform-extra">{extraSection}</div> : null}

      {quickAdd
        ? (() => {
            const catalog = catalogFor(quickAdd);
            if (!catalog) return null;
            return (
              <QuickAddRefModal
                collection={catalog.collection}
                title={catalog.title}
                fields={catalog.fields}
                onCreated={(id) => {
                  handleChange(quickAdd.key, id);
                  setQuickAdd(null);
                }}
                onClose={() => setQuickAdd(null)}
              />
            );
          })()
        : null}
    </Modal>
  );
}