import { useMemo, useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { createDocument, setDocument } from '../../services/firestoreService';
import {
  normalizeText,
  parseCsv,
  parseCsvBool,
  parseCsvDate,
  parseCsvNumber,
} from '../../services/csv';
import { buildRefLabel } from '../../config/collections';
import type { RefMaps } from '../../hooks/useRefMaps';
import type { FieldConfig, FieldValue } from '../../types/models';
import './ImportCsvModal.css';

interface ImportCsvModalProps {
  title: string;
  collection: string;
  fields: FieldConfig[];
  refMaps: RefMaps;
  /** Campo que se llena con el uid del usuario actual (si el módulo lo define). */
  autoUserField?: string;
  currentUid: string | null;
  /**
   * Escritor personalizado por fila (p. ej. usuarios, que además crean cuenta
   * en Firebase Auth). Si no se define, se escribe directo a la colección.
   */
  writeRow?: (docId: string | null, values: Record<string, FieldValue>) => Promise<void>;
  onClose: () => void;
}

interface PreparedRow {
  index: number;
  /** ID de AppSheet (columna ID del CSV). Null = Firestore genera uno. */
  docId: string | null;
  values: Record<string, FieldValue>;
  display: string[];
  errors: string[];
  /** Avisos no bloqueantes (la fila SÍ se importa). */
  warnings: string[];
}

type Phase = 'pick' | 'preview' | 'importing' | 'done';

const AMBIGUOUS = '__AMBIGUO__';
const PREVIEW_LIMIT = 60;

/** "2,23135E+13" | "1.9E+14": número colapsado por Excel/Sheets — dato perdido. */
const SCIENTIFIC_NOTATION = /^\d+([.,]\d+)?E[+-]?\d+$/i;

/** Índices nombre-normalizado -> id por colección referenciada. */
function buildRefIndexes(refMaps: RefMaps) {
  const indexes: Record<
    string,
    { ids: Set<string>; exact: Map<string, string>; loose: Map<string, string> }
  > = {};
  Object.entries(refMaps).forEach(([collectionName, data]) => {
    const ids = new Set<string>();
    const exact = new Map<string, string>();
    const loose = new Map<string, string>();
    data.rows.forEach((row) => {
      ids.add(row.id);
      exact.set(normalizeText(buildRefLabel(collectionName, row)), row.id);
      Object.entries(row).forEach(([key, value]) => {
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
        if (typeof value !== 'string' || value.trim() === '') return;
        const normalized = normalizeText(value);
        const existing = loose.get(normalized);
        if (existing !== undefined && existing !== row.id) {
          loose.set(normalized, AMBIGUOUS);
        } else {
          loose.set(normalized, row.id);
        }
      });
    });
    indexes[collectionName] = { ids, exact, loose };
  });
  return indexes;
}

/**
 * Importador CSV genérico: valida obligatorios, enums, fechas, números y
 * referencias por NOMBRE antes de escribir. Solo importa filas válidas.
 * Reutilizado por todos los módulos y catálogos.
 */
export function ImportCsvModal({
  title,
  collection,
  fields,
  refMaps,
  autoUserField,
  currentUid,
  writeRow,
  onClose,
}: ImportCsvModalProps) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedRow[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [failures, setFailures] = useState<{ index: number; message: string }[]>([]);
  const [hasIdColumn, setHasIdColumn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refIndexes = useMemo(() => buildRefIndexes(refMaps), [refMaps]);
  const validRows = prepared.filter((r) => r.errors.length === 0);

  const convertCell = (
    field: FieldConfig,
    raw: string,
  ): { value: FieldValue; error?: string; warning?: string } => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (field.required) return { value: null, error: `"${field.label}" is required` };
      return { value: field.type === 'bool' ? false : null };
    }
    switch (field.type) {
      case 'number':
      case 'currency': {
        const value = parseCsvNumber(trimmed);
        return value === null
          ? { value: null, error: `"${field.label}": "${trimmed}" is not a number` }
          : { value };
      }
      case 'date': {
        const value = parseCsvDate(trimmed);
        return value === null
          ? { value: null, error: `"${field.label}": "${trimmed}" is not a date (use DD/MM/YYYY)` }
          : { value };
      }
      case 'bool': {
        const value = parseCsvBool(trimmed);
        return value === null
          ? { value: null, error: `"${field.label}": use YES or NO` }
          : { value };
      }
      case 'enum': {
        const match = (field.enumValues ?? []).find(
          (option) => normalizeText(option) === normalizeText(trimmed),
        );
        return match === undefined
          ? {
              value: null,
              error: `"${field.label}": "${trimmed}" is not one of: ${(field.enumValues ?? []).join(', ')}`,
            }
          : { value: match };
      }
      case 'ref': {
        const index = field.refCollection ? refIndexes[field.refCollection] : undefined;
        if (!index) return { value: null, error: `"${field.label}": catalog not available` };
        // Primero: ¿es directamente un ID existente (AppSheet)?
        if (index.ids.has(trimmed)) return { value: trimmed };
        const normalized = normalizeText(trimmed);
        const exactId = index.exact.get(normalized);
        if (exactId !== undefined) return { value: exactId };
        const looseId = index.loose.get(normalized);
        if (looseId === AMBIGUOUS) {
          return { value: null, error: `"${field.label}": "${trimmed}" is ambiguous, use the full name` };
        }
        if (looseId !== undefined) return { value: looseId };
        // Referencia a un registro que aún no existe (p. ej. driver dado de baja
        // que no viene en tu CSV): se guarda el ID tal cual y se resolverá solo
        // cuando importes ese registro con el mismo ID de AppSheet.
        return {
          value: trimmed,
          warning: `"${field.label}": "${trimmed}" does not exist yet — it will be saved and resolved once you import that record`,
        };
      }
      default:
        if (SCIENTIFIC_NOTATION.test(trimmed)) {
          return {
            value: null,
            error: `"${field.label}": "${trimmed}" is Excel scientific notation — format that column as Plain text in your sheet and re-export the CSV`,
          };
        }
        return { value: trimmed };
    }
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setFileName(file.name);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (headers.length === 0 || rows.length === 0) {
      setFileError('The file is empty or has no data rows');
      return;
    }

    const columnByField = new Map<string, number>();
    fields.forEach((field) => {
      const idx = headers.findIndex((h) => normalizeText(h) === normalizeText(field.label));
      if (idx !== -1) columnByField.set(field.key, idx);
    });
    const idColumnIndex = headers.findIndex((h) => normalizeText(h) === 'id');

    const missing = fields
      .filter((f) => f.required && !columnByField.has(f.key))
      .map((f) => f.label);
    setMissingColumns(missing);
    if (missing.length > 0) {
      setFileError(null);
      setPrepared([]);
      setPhase('preview');
      return;
    }

    const seenIds = new Set<string>();
    const preparedRows: PreparedRow[] = rows.map((row, rowIndex) => {
      const values: Record<string, FieldValue> = {};
      const display: string[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      let docId: string | null = null;
      if (idColumnIndex !== -1) {
        const rawId = (row[idColumnIndex] ?? '').trim();
        if (rawId !== '') {
          if (rawId.includes('/')) {
            errors.push('The ID cannot contain "/"');
          } else if (seenIds.has(rawId)) {
            errors.push(`ID "${rawId}" repeated in the file`);
          } else {
            seenIds.add(rawId);
            docId = rawId;
          }
        }
        display.push(rawId === '' ? '—' : rawId);
      }

      fields.forEach((field) => {
        const columnIndex = columnByField.get(field.key);
        const raw = columnIndex === undefined ? '' : (row[columnIndex] ?? '');
        const { value, error, warning } = convertCell(field, raw);
        values[field.key] = value;
        display.push(raw.trim() === '' ? '—' : raw.trim());
        if (error) errors.push(error);
        if (warning) warnings.push(warning);
      });
      return { index: rowIndex + 2, docId, values, display, errors, warnings };
    });
    setHasIdColumn(idColumnIndex !== -1);
    setPrepared(preparedRows);
    setPhase('preview');
  };

  const handleImport = async () => {
    setPhase('importing');
    let count = 0;
    let processed = 0;
    const failed: { index: number; message: string }[] = [];
    for (const row of validRows) {
      const payload = { ...row.values };
      if (autoUserField && currentUid) payload[autoUserField] = currentUid;
      try {
        if (writeRow) {
          await writeRow(row.docId, payload);
        } else if (row.docId) {
          await setDocument(collection, row.docId, payload);
        } else {
          await createDocument(collection, payload);
        }
        count += 1;
      } catch (err) {
        failed.push({
          index: row.index,
          message: err instanceof Error ? err.message : 'Could not save',
        });
      }
      processed += 1;
      setProgress(processed);
    }
    setImported(count);
    setFailures(failed);
    setPhase('done');
  };

  const errorRows = prepared.filter((r) => r.errors.length > 0);
  const warningRows = prepared.filter((r) => r.errors.length === 0 && r.warnings.length > 0);

  return (
    <Modal open title={`Import CSV · ${title}`} onClose={onClose} size="lg"
      footer={
        phase === 'preview' && missingColumns.length === 0 ? (
          <>
            <span className="imp-footer-info">
              {validRows.length} rows ready · {errorRows.length} with errors
            </span>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleImport()}
              disabled={validRows.length === 0}
            >
              <Upload size={16} />
              Import {validRows.length} rows
            </button>
          </>
        ) : phase === 'done' ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        ) : undefined
      }
    >
      {phase === 'pick' ? (
        <div className="imp-pick">
          <button type="button" className="imp-drop" onClick={() => inputRef.current?.click()}>
            <FileUp size={30} />
            <strong>Select the CSV file</strong>
            <span>Exported from Google Sheets: File → Download → CSV</span>
            {fileName ? <em>{fileName}</em> : null}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="imp-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {fileError ? <p className="imp-error">{fileError}</p> : null}

          <div className="imp-guide">
            <h3>Filling guide</h3>
            <p className="imp-guide-note">
              Optional <strong>ID</strong> column: the AppSheet ID. When present it becomes the
              identifier (re-importing with the same ID updates instead of duplicating) and
              reference columns accept that ID or the name.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Required</th>
                  <th>Format / allowed values</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.key}>
                    <td>{field.label}</td>
                    <td>{field.required ? 'Yes' : 'No'}</td>
                    <td>
                      {field.type === 'enum'
                        ? (field.enumValues ?? []).join(', ')
                        : field.type === 'date'
                          ? 'DD/MM/YYYY'
                          : field.type === 'bool'
                            ? 'YES or NO'
                            : field.type === 'ref'
                              ? 'Exact name as shown in the app'
                              : field.type === 'number' || field.type === 'currency'
                                ? 'Number'
                                : 'Text'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {phase === 'preview' && missingColumns.length > 0 ? (
        <div className="imp-missing">
          <p className="imp-error">
            The CSV is missing these required columns: {missingColumns.join(', ')}
          </p>
          <button type="button" className="btn btn-outline" onClick={() => setPhase('pick')}>
            Choose another file
          </button>
        </div>
      ) : null}

      {phase === 'preview' && missingColumns.length === 0 ? (
        <div className="imp-preview">
          {errorRows.length > 0 ? (
            <div className="imp-errors-box">
              <strong>Rows with errors (they will NOT be imported):</strong>
              <ul>
                {errorRows.slice(0, 12).map((row) => (
                  <li key={row.index}>
                    Row {row.index}: {row.errors.join(' · ')}
                  </li>
                ))}
                {errorRows.length > 12 ? <li>…and {errorRows.length - 12} more</li> : null}
              </ul>
            </div>
          ) : null}
          {warningRows.length > 0 ? (
            <div className="imp-warnings-box">
              <strong>
                Rows with warnings (they ARE imported; the references will resolve once you
                import those records):
              </strong>
              <ul>
                {warningRows.slice(0, 8).map((row) => (
                  <li key={row.index}>
                    Row {row.index}: {row.warnings.join(' · ')}
                  </li>
                ))}
                {warningRows.length > 8 ? <li>…and {warningRows.length - 8} more</li> : null}
              </ul>
            </div>
          ) : null}
          <div className="imp-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  {hasIdColumn ? <th>ID</th> : null}
                  {fields.map((f) => (
                    <th key={f.key}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prepared.slice(0, PREVIEW_LIMIT).map((row) => (
                  <tr key={row.index} className={row.errors.length > 0 ? 'is-invalid' : ''}>
                    <td>{row.index}</td>
                    <td>
                      <Badge
                        value={
                          row.errors.length > 0 ? 'MAL' : row.warnings.length > 0 ? 'AVISO' : 'OK'
                        }
                      />
                    </td>
                    {row.display.map((cell, i) => (
                      <td key={i}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prepared.length > PREVIEW_LIMIT ? (
            <p className="imp-more">Showing {PREVIEW_LIMIT} of {prepared.length} rows</p>
          ) : null}
        </div>
      ) : null}

      {phase === 'importing' ? (
        <p className="imp-progress">
          Importing… {progress} of {validRows.length}
        </p>
      ) : null}

      {phase === 'done' ? (
        <div className="imp-done">
          <p className="imp-done-ok">
            ✔ {imported} records imported into {title}
            {hasIdColumn ? ' (rows with an existing ID were updated)' : ''}.
          </p>
          {errorRows.length > 0 ? (
            <p>
              {errorRows.length} rows were left out due to errors: fix them in your sheet and
              re-import just those.
            </p>
          ) : null}
          {failures.length > 0 ? (
            <div className="imp-errors-box">
              <strong>{failures.length} rows failed to save:</strong>
              <ul>
                {failures.slice(0, 10).map((f) => (
                  <li key={f.index}>
                    Row {f.index}: {f.message}
                  </li>
                ))}
                {failures.length > 10 ? <li>…and {failures.length - 10} more</li> : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
