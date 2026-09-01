import { fetchCollection } from './firestoreService';
import { exportWorkbook, type ExcelSheet } from './excelExport';
import { REF_LABEL_DEPENDENCIES, buildRefLabel } from '../config/collections';
import { displayCell } from '../components/crud/displayValue';
import { effectiveValue } from '../components/crud/displayValue';
import { isAlertValue } from '../hooks/useAlertThresholds';
import type { EntityData, ModuleConfig } from '../types/models';

/** Campo por el que se filtra el rango: la fecha del registro o la de captura. */
function dateKeyOf(config: ModuleConfig): string {
  const dateField = config.fields.find((f) => f.type === 'date' && f.key === 'date');
  return dateField ? dateField.key : 'createdAt';
}

function inRange(row: EntityData, key: string, from: string, to: string): boolean {
  const raw = row[key];
  const value = typeof raw === 'string' ? raw.slice(0, 10) : '';
  if (from && (value === '' || value < from)) return false;
  if (to && (value === '' || value > to)) return false;
  return true;
}

/**
 * Paquete de reportes: un solo archivo de Excel con una hoja por módulo,
 * filtrado por rango de fechas. Los valores salen resueltos a nombres.
 */
export async function exportReportsWorkbook(
  modules: ModuleConfig[],
  from: string,
  to: string,
  /** Umbrales de alerta: las celdas en o bajo su umbral salen en ROJO. */
  thresholds: Record<string, number> = {},
): Promise<{ sheets: number; rows: number }> {
  // 1. Catálogos referenciados por los módulos elegidos (para resolver nombres).
  const refCollections = new Set<string>();
  modules.forEach((config) => {
    config.fields.forEach((field) => {
      if (field.type === 'ref' && field.refCollection) refCollections.add(field.refCollection);
    });
  });

  // Colecciones auxiliares para etiquetas compuestas (driver -> team).
  [...refCollections].forEach((name) => {
    (REF_LABEL_DEPENDENCIES[name] ?? []).forEach((dep) => refCollections.add(dep));
  });

  const rowsByCollection: Record<string, EntityData[]> = {};
  await Promise.all(
    [...refCollections].map(async (collectionName) => {
      rowsByCollection[collectionName] = await fetchCollection(collectionName);
    }),
  );

  const resolve = (collectionName: string, id: string): string | undefined => {
    const row = rowsByCollection[collectionName]?.find((r) => r.id === id);
    const name = row?.name;
    return typeof name === 'string' && name !== '' ? name : undefined;
  };

  const refLabelMaps: Record<string, Map<string, string>> = {};
  Object.entries(rowsByCollection).forEach(([collectionName, rows]) => {
    const map = new Map<string, string>();
    rows.forEach((row) => map.set(row.id, buildRefLabel(collectionName, row, resolve)));
    refLabelMaps[collectionName] = map;
  });

  const refLabel = (collectionName: string, id: string): string =>
    refLabelMaps[collectionName]?.get(id) ?? '—';

  // 2. Una hoja por módulo con sus registros dentro del rango.
  const sheets: ExcelSheet[] = [];
  let totalRows = 0;

  for (const config of modules) {
    const rows = await fetchCollection(config.collection);
    const dateKey = dateKeyOf(config);
    const filtered = rows
      .filter((row) => inRange(row, dateKey, from, to))
      .sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')));
    totalRows += filtered.length;
    sheets.push({
      name: config.title,
      columns: config.fields.map((field) => ({
        header: field.label,
        values: filtered.map((row) => displayCell(field, row, refLabel)),
        alerts: filtered.map((row) => isAlertValue(field, effectiveValue(field, row), thresholds)),
      })),
    });
  }

  const rangeLabel = `${from || 'start'}_${to || 'today'}`;
  await exportWorkbook(`ServiExpress_Reports_${rangeLabel}`, sheets);
  return { sheets: sheets.length, rows: totalRows };
}