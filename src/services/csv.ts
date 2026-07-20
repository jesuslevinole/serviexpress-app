import type { FieldConfig, FieldValue } from '../types/models';

/** Resultado de parsear un CSV crudo. */
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/** Quita acentos, espacios extra, asterisco de obligatorio y pasa a minúsculas. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*+$/g, '')
    .trim()
    .toLowerCase();
}

/** Detecta el delimitador más frecuente en la primera línea (Sheets usa coma, Excel ES usa punto y coma). */
function detectDelimiter(firstLine: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  candidates.forEach((delimiter) => {
    let count = 0;
    let inQuotes = false;
    for (const char of firstLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) count += 1;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  });
  return best;
}

/**
 * Parser CSV propio (sin dependencias): maneja comillas, comas dentro de
 * comillas, comillas escapadas (""), saltos CRLF/LF y BOM de Excel.
 */
export function parseCsv(rawText: string): ParsedCsv {
  const text = rawText.replace(/^\uFEFF/, '');
  const firstLineEnd = text.indexOf('\n');
  const delimiter = detectDelimiter(firstLineEnd === -1 ? text : text.slice(0, firstLineEnd));

  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      current.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      current.push(cell);
      cell = '';
      if (current.some((c) => c.trim() !== '')) rows.push(current);
      current = [];
    } else {
      cell += char;
    }
  }
  current.push(cell);
  if (current.some((c) => c.trim() !== '')) rows.push(current);

  const [headers = [], ...dataRows] = rows;
  return { headers: headers.map((h) => h.trim()), rows: dataRows };
}

/** Genera y descarga la plantilla CSV de un módulo (encabezados = etiquetas). */
export function downloadCsvTemplate(title: string, fields: FieldConfig[]): void {
  const headers = fields.map((f) => {
    const label = f.required ? `${f.label} *` : f.label;
    return `"${label.replace(/"/g, '""')}"`;
  });
  // BOM para que Excel abra acentos correctamente; CRLF por compatibilidad.
  const content = `\uFEFF${headers.join(',')}\r\n`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Plantilla_${title.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** "1.234,56" | "1,234.56" | "1234.56" -> número. Devuelve null si no es número. */
export function parseCsvNumber(raw: string): number | null {
  let cleaned = raw.replace(/\s/g, '').replace(/\$/g, '');
  if (cleaned === '') return null;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) {
    cleaned =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** DD/MM/AAAA, DD-MM-AAAA o AAAA-MM-DD -> "AAAA-MM-DD". Null si no es fecha válida. */
export function parseCsvDate(raw: string): string | null {
  const trimmed = raw.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const latin = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  let year: number;
  let month: number;
  let day: number;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (latin) {
    day = Number(latin[1]);
    month = Number(latin[2]);
    year = Number(latin[3]);
  } else {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

const TRUE_WORDS = new Set(['si', 'sí', 'yes', 'true', '1', 'x']);
const FALSE_WORDS = new Set(['no', 'false', '0', '']);

/** SI/NO (y variantes) -> boolean. Null si no se reconoce. */
export function parseCsvBool(raw: string): boolean | null {
  const normalized = normalizeText(raw);
  if (TRUE_WORDS.has(normalized)) return true;
  if (FALSE_WORDS.has(normalized)) return false;
  return null;
}

export type { FieldValue };