import { useMemo, useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { createDocument } from '../../services/firestoreService';
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
  onClose: () => void;
}

interface PreparedRow {
  index: number;
  values: Record<string, FieldValue>;
  display: string[];
  errors: string[];
}

type Phase = 'pick' | 'preview' | 'importing' | 'done';

const AMBIGUOUS = '__AMBIGUO__';
const PREVIEW_LIMIT = 60;

/** Índices nombre-normalizado -> id por colección referenciada. */
function buildRefIndexes(refMaps: RefMaps) {
  const indexes: Record<string, { exact: Map<string, string>; loose: Map<string, string> }> = {};
  Object.entries(refMaps).forEach(([collectionName, data]) => {
    const exact = new Map<string, string>();
    const loose = new Map<string, string>();
    data.rows.forEach((row) => {
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
    indexes[collectionName] = { exact, loose };
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
  onClose,
}: ImportCsvModalProps) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedRow[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const refIndexes = useMemo(() => buildRefIndexes(refMaps), [refMaps]);
  const validRows = prepared.filter((r) => r.errors.length === 0);

  const convertCell = (field: FieldConfig, raw: string): { value: FieldValue; error?: string } => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (field.required) return { value: null, error: `"${field.label}" es obligatorio` };
      return { value: field.type === 'bool' ? false : null };
    }
    switch (field.type) {
      case 'number':
      case 'currency': {
        const value = parseCsvNumber(trimmed);
        return value === null
          ? { value: null, error: `"${field.label}": "${trimmed}" no es un número` }
          : { value };
      }
      case 'date': {
        const value = parseCsvDate(trimmed);
        return value === null
          ? { value: null, error: `"${field.label}": "${trimmed}" no es fecha (usa DD/MM/AAAA)` }
          : { value };
      }
      case 'bool': {
        const value = parseCsvBool(trimmed);
        return value === null
          ? { value: null, error: `"${field.label}": usa SI o NO` }
          : { value };
      }
      case 'enum': {
        const match = (field.enumValues ?? []).find(
          (option) => normalizeText(option) === normalizeText(trimmed),
        );
        return match === undefined
          ? {
              value: null,
              error: `"${field.label}": "${trimmed}" no está en: ${(field.enumValues ?? []).join(', ')}`,
            }
          : { value: match };
      }
      case 'ref': {
        const index = field.refCollection ? refIndexes[field.refCollection] : undefined;
        if (!index) return { value: null, error: `"${field.label}": catálogo no disponible` };
        const normalized = normalizeText(trimmed);
        const exactId = index.exact.get(normalized);
        if (exactId !== undefined) return { value: exactId };
        const looseId = index.loose.get(normalized);
        if (looseId === AMBIGUOUS) {
          return { value: null, error: `"${field.label}": "${trimmed}" es ambiguo, usa el nombre completo` };
        }
        if (looseId !== undefined) return { value: looseId };
        return { value: null, error: `"${field.label}": "${trimmed}" no existe en el catálogo` };
      }
      default:
        return { value: trimmed };
    }
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setFileName(file.name);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (headers.length === 0 || rows.length === 0) {
      setFileError('El archivo está vacío o no tiene filas de datos');
      return;
    }

    const columnByField = new Map<string, number>();
    fields.forEach((field) => {
      const idx = headers.findIndex((h) => normalizeText(h) === normalizeText(field.label));
      if (idx !== -1) columnByField.set(field.key, idx);
    });

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

    const preparedRows: PreparedRow[] = rows.map((row, rowIndex) => {
      const values: Record<string, FieldValue> = {};
      const display: string[] = [];
      const errors: string[] = [];
      fields.forEach((field) => {
        const columnIndex = columnByField.get(field.key);
        const raw = columnIndex === undefined ? '' : (row[columnIndex] ?? '');
        const { value, error } = convertCell(field, raw);
        values[field.key] = value;
        display.push(raw.trim() === '' ? '—' : raw.trim());
        if (error) errors.push(error);
      });
      return { index: rowIndex + 2, values, display, errors };
    });
    setPrepared(preparedRows);
    setPhase('preview');
  };

  const handleImport = async () => {
    setPhase('importing');
    let count = 0;
    for (const row of validRows) {
      const payload = { ...row.values };
      if (autoUserField && currentUid) payload[autoUserField] = currentUid;
      await createDocument(collection, payload);
      count += 1;
      setProgress(count);
    }
    setImported(count);
    setPhase('done');
  };

  const errorRows = prepared.filter((r) => r.errors.length > 0);

  return (
    <Modal open title={`Importar CSV · ${title}`} onClose={onClose} size="lg"
      footer={
        phase === 'preview' && missingColumns.length === 0 ? (
          <>
            <span className="imp-footer-info">
              {validRows.length} filas listas · {errorRows.length} con errores
            </span>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleImport()}
              disabled={validRows.length === 0}
            >
              <Upload size={16} />
              Importar {validRows.length} filas
            </button>
          </>
        ) : phase === 'done' ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        ) : undefined
      }
    >
      {phase === 'pick' ? (
        <div className="imp-pick">
          <button type="button" className="imp-drop" onClick={() => inputRef.current?.click()}>
            <FileUp size={30} />
            <strong>Selecciona el archivo CSV</strong>
            <span>Exportado desde Google Sheets: Archivo → Descargar → CSV</span>
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
            <h3>Guía de llenado</h3>
            <table>
              <thead>
                <tr>
                  <th>Columna</th>
                  <th>Obligatoria</th>
                  <th>Formato / valores permitidos</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.key}>
                    <td>{field.label}</td>
                    <td>{field.required ? 'Sí' : 'No'}</td>
                    <td>
                      {field.type === 'enum'
                        ? (field.enumValues ?? []).join(', ')
                        : field.type === 'date'
                          ? 'DD/MM/AAAA'
                          : field.type === 'bool'
                            ? 'SI o NO'
                            : field.type === 'ref'
                              ? 'Nombre exacto como aparece en el app'
                              : field.type === 'number' || field.type === 'currency'
                                ? 'Número'
                                : 'Texto'}
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
            Al CSV le faltan estas columnas obligatorias: {missingColumns.join(', ')}
          </p>
          <button type="button" className="btn btn-outline" onClick={() => setPhase('pick')}>
            Elegir otro archivo
          </button>
        </div>
      ) : null}

      {phase === 'preview' && missingColumns.length === 0 ? (
        <div className="imp-preview">
          {errorRows.length > 0 ? (
            <div className="imp-errors-box">
              <strong>Filas con errores (no se importarán):</strong>
              <ul>
                {errorRows.slice(0, 12).map((row) => (
                  <li key={row.index}>
                    Fila {row.index}: {row.errors.join(' · ')}
                  </li>
                ))}
                {errorRows.length > 12 ? <li>…y {errorRows.length - 12} más</li> : null}
              </ul>
            </div>
          ) : null}
          <div className="imp-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estado</th>
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
                      <Badge value={row.errors.length > 0 ? 'MAL' : 'OK'} />
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
            <p className="imp-more">Mostrando {PREVIEW_LIMIT} de {prepared.length} filas</p>
          ) : null}
        </div>
      ) : null}

      {phase === 'importing' ? (
        <p className="imp-progress">
          Importando… {progress} de {validRows.length}
        </p>
      ) : null}

      {phase === 'done' ? (
        <div className="imp-done">
          <p className="imp-done-ok">✔ Se importaron {imported} registros a {title}.</p>
          {errorRows.length > 0 ? (
            <p>
              {errorRows.length} filas quedaron fuera por errores: corrígelas en tu hoja y vuelve a
              importar solo esas.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}