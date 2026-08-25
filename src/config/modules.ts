import type { EntityData, FieldConfig, FieldValue, ModuleConfig } from '../types/models';

/**
 * Fórmula de AppSheet para estatus de vencimiento:
 * >30 días = OK · ≤15 días (o sin fecha / vencido) = ALERT · 16-30 = CAUTION.
 */
function expirationStatus(dateKey: string): (row: EntityData) => FieldValue {
  return (row) => {
    const raw = row[dateKey];
    if (typeof raw !== 'string' || raw === '') return 'ALERT';
    const target = new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(target.getTime())) return 'ALERT';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 30) return 'OK';
    if (days <= 15) return 'ALERT';
    return 'CAUTION';
  };
}
import { COLLECTIONS } from './collections';
import {
  MAINTENANCE_STATUS,
  DOC_STATUS,
  REQUIREMENT_STATUS,
  TYPE_SIZES,
  SHOP_STATUS,
} from './enums';

/**
 * Campos de contexto que se repiten en casi todas las tablas
 * (ID_ENTITY / ID_STATION del diagrama). Definidos una sola vez.
 */
/**
 * Capturista del registro: lo llena el sistema, pero SÍ aparece en la plantilla
 * y en la importación para poder migrar quién capturó cada registro.
 */
const capturedByField: FieldConfig = {
  key: 'idUsers',
  label: 'Captured by',
  importAliases: ['Responsable', 'Responsible', 'BC', 'User', 'Usuario'],
  type: 'ref',
  refCollection: COLLECTIONS.users,
  form: false,
  importable: true,
};

const contextFields = (
  tablaEntity = true,
  tablaStation = true,
  required = true,
): FieldConfig[] => [
  {
    key: 'idEntity',
    label: 'Entity',
    type: 'ref',
    refCollection: COLLECTIONS.entities,
    required,
    table: tablaEntity,
    defaultFromUserScope: 'entity',
  },
  {
    key: 'idStation',
    label: 'Station',
    type: 'ref',
    refCollection: COLLECTIONS.stations,
    required,
    table: tablaStation,
    defaultFromUserScope: 'station',
  },
];

/** Módulo BD_TRUCK — Camiones. */
export const trucksModule: ModuleConfig = {
  id: 'trucks',
  collection: COLLECTIONS.trucks,
  title: 'Trucks',
  icon: 'Truck',
  autoUserField: 'idUsers',
  fields: [
    { key: 'date', label: 'Register date', type: 'date', defaultToday: true, required: true, table: false },
    {
      key: 'idStationReg',
      label: 'Register station',
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      required: true,
      table: false,
      defaultFromUserScope: 'station',
    },
    {
      key: 'idEntityReg',
      label: 'Register entity',
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      required: true,
      table: false,
      defaultFromUserScope: 'entity',
    },
    { key: 'vMake', label: 'V/Make', type: 'text', table: false },
    { key: 'unitN', label: 'Unit number', type: 'text', required: true },
    { key: 'type', label: 'Unit type', type: 'enum', enumValues: ['TRUCK', 'SCANNER'], required: true },
    { key: 'vYear', label: 'V/Year', type: 'number', table: false },
    { key: 'lPlate', label: 'License plate', type: 'text', required: true },
    { key: 'nextMant', label: 'Next maintenance', type: 'number', highlight: 'value' },
    {
      key: 'mileage',
      label: 'Actual Mileage',
      type: 'number',
      highlight: 'value',
      // Lo mantiene el sistema: cada mantenimiento preventivo (y cada renglón
      // de BC Report) escribe aquí el millaje capturado. Se muestra bloqueado
      // en el formulario del camión para poder consultarlo sin editarlo.
      readOnly: true,
      importable: true,
    },
    { key: 'vinNumber', label: 'VIN number', type: 'text', table: false },
    { key: 'ezTagNumber', label: 'EZ Tag number', type: 'text', table: false },
    { key: 'schB', label: 'Sch/B', type: 'text', table: false },
    {
      key: 'idEntityActual',
      label: 'Current entity',
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      required: true,
      defaultFromUserScope: 'entity',
    },
    {
      key: 'idStationActual',
      label: 'Current station',
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      required: true,
      defaultFromUserScope: 'station',
    },
    { key: 'regExpDate', label: 'Reg Exp. Date', type: 'date', table: false },
    {
      key: 'resStatus',
      label: 'Res status',
      type: 'text',
      form: false,
      badge: true,
      compute: expirationStatus('regExpDate'),
    },
    { key: 'inspExpDate', label: 'Insp Exp. Date', type: 'date', table: false },
    {
      key: 'insStatus',
      label: 'Ins status',
      type: 'text',
      form: false,
      badge: true,
      compute: expirationStatus('inspExpDate'),
    },
    { key: 'status', label: 'Status', type: 'bool', defaultValue: true },
    capturedByField,
  ],
  /** Bitácora: cada cambio de entidad/estación actual queda registrado. */
  changeLog: {
    collection: COLLECTIONS.truckHistory,
    foreignKey: 'idTruck',
    watch: ['idEntityActual', 'idStationActual'],
  },
  relatedViews: [
    {
      id: 'corrective',
      title: 'Corrective maintenance',
      collection: COLLECTIONS.maintenance,
      foreignKey: 'idTruck',
      filter: { field: 'type', value: 'Corrective' },
      emptyMessage: 'This truck has no corrective maintenance yet',
      fields: [
        { key: 'date', label: 'Date', type: 'date', defaultToday: true },
        {
          key: 'idStation',
          label: 'Station',
          type: 'ref',
          refCollection: COLLECTIONS.stations,
        },
        { key: 'differenceMileage', label: 'Difference Mileage', type: 'number' },
        { key: 'observation', label: 'Observation', type: 'text' },
        {
          key: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: MAINTENANCE_STATUS,
          badge: true,
        },
        {
          key: 'idUsers',
          label: 'Captured by',
          type: 'ref',
          refCollection: COLLECTIONS.users,
        },
      ],
    },
    {
      id: 'preventive',
      title: 'Preventive maintenance',
      collection: COLLECTIONS.maintenance,
      foreignKey: 'idTruck',
      filter: { field: 'type', value: 'Preventive' },
      emptyMessage: 'This truck has no preventive maintenance yet',
      fields: [
        { key: 'date', label: 'Date', type: 'date', defaultToday: true },
        { key: 'mileage', label: 'Actual Mileage', type: 'number' },
        { key: 'nextMant', label: 'Next mant', type: 'number' },
        {
          key: 'status',
          label: 'Status',
          type: 'enum',
          enumValues: MAINTENANCE_STATUS,
          badge: true,
        },
        { key: 'origin', label: 'Source', type: 'text' },
        {
          key: 'idUsers',
          label: 'Captured by',
          type: 'ref',
          refCollection: COLLECTIONS.users,
        },
      ],
    },
    {
      id: 'moves',
      title: 'Entity / Station history',
      collection: COLLECTIONS.truckHistory,
      foreignKey: 'idTruck',
      emptyMessage: 'This truck has not changed entity or station yet',
      fields: [
        { key: 'date', label: 'Date', type: 'date', defaultToday: true },
        { key: 'fieldLabel', label: 'Field', type: 'text' },
        { key: 'fromLabel', label: 'From', type: 'text' },
        { key: 'toLabel', label: 'To', type: 'text' },
        {
          key: 'idUsers',
          label: 'Changed by',
          type: 'ref',
          refCollection: COLLECTIONS.users,
        },
      ],
    },
  ],
};

/** Módulo BD_DRIVER — Drivers. */
export const driversModule: ModuleConfig = {
  id: 'drivers',
  collection: COLLECTIONS.drivers,
  title: 'Drivers',
  icon: 'Users',
  autoUserField: 'idUsers',
  fields: [
    {
      key: 'idTeam',
      label: 'Driver name',
      type: 'ref',
      refCollection: COLLECTIONS.team,
      required: true,
      // El nombre elegido se copia a "name" para que el resto del app
      // (Assets, Fleet, Accidents, Requirements) siga mostrándolo.
      copyLabelTo: 'name',
      // Alta rápida: se escriben los datos de la persona (nombre, correo,
      // teléfono) y se guarda de una vez en Team y en Drivers.
      quickAddInline: true,
      // Mientras un driver no tenga su referencia a Team, se muestra el
      // nombre que ya estaba guardado en el registro.
      fallbackField: 'name',
    },
    { key: 'name', label: 'Name (from Team)', type: 'text', form: false, table: false },
    { key: 'date', label: 'Register date', type: 'date', defaultToday: true, table: false },
    ...contextFields(true, true, false),
    {
      key: 'idCategoryDriver',
      label: 'Category',
      type: 'ref',
      refCollection: COLLECTIONS.driverCategories,
    },
    // --- Columnas del listado maestro de conductores ---
    { key: 'badge', label: 'Badge', type: 'text', table: false, importable: true },
    { key: 'nationality', label: 'Nationality', type: 'text', table: false, importable: true },
    {
      key: 'i9Date',
      label: 'I9 start date',
      type: 'date',
      table: false,
      importable: true,
    },
    {
      key: 'employmentPermit',
      label: 'Employment permit',
      type: 'date',
      table: false,
      importable: true,
    },
    { key: 'dlState', label: 'DL state', type: 'text', table: false, importable: true },
    { key: 'dlExpDate', label: 'DL exp. date', type: 'date', table: false, importable: true },
    { key: 'dotExpDate', label: 'DOT exp. date', type: 'date', table: false, importable: true },
    {
      key: 'certExpDate',
      label: 'Certification exp. date',
      type: 'date',
      table: false,
      importable: true,
    },
    { key: 'fa', label: 'FA', type: 'bool', table: false },
    { key: 'sta', label: 'STA', type: 'bool', table: false },
    { key: 'status', label: 'Status', type: 'bool', defaultValue: true },
    { key: 'hiringDate', label: 'Hiring date', type: 'date', table: false },
    { key: 'insurance', label: 'Insurance', type: 'text', table: false },
    { key: 'fedexId', label: 'FedEx ID', type: 'text' },
    { key: 'dlNumber', label: 'DL number', type: 'text', table: false },
    { key: 'dlAprobationDate', label: 'DL approbation date', type: 'date', table: false },
    { key: 'dlStatus', label: 'DL status', type: 'enum', enumValues: DOC_STATUS, table: false },
    { key: 'dot', label: 'DOT', type: 'text', table: false },
    { key: 'dotStatus', label: 'DOT status', type: 'enum', enumValues: DOC_STATUS, table: false },
    { key: 'qc', label: 'QC', type: 'text', table: false },
    { key: 'qcStatus', label: 'QC status', type: 'enum', enumValues: DOC_STATUS, table: false },
    { key: 'eaExpDate', label: 'EA exp. date', type: 'date', table: false },
    capturedByField,
  ],
};

/** Módulo BD_ASSET — Assets. */
export const assetsModule: ModuleConfig = {
  id: 'assets',
  collection: COLLECTIONS.assets,
  title: 'Assets',
  icon: 'ScanLine',
  autoUserField: 'idUsers',
  fields: [
    { key: 'type', label: 'Asset type', type: 'text' },
    { key: 'mark', label: 'Make', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'serialNumber', label: 'Serial number', type: 'text' },
    { key: 'date', label: 'Register date', type: 'date', defaultToday: true, table: false },
    { key: 'status', label: 'Status', type: 'text' },
    {
      key: 'idDriver',
      label: 'Assigned driver',
      type: 'ref',
      refCollection: COLLECTIONS.drivers,
    },
    ...contextFields(false, false, false),
    { key: 'observation', label: 'Observations', type: 'textarea', table: false },
    capturedByField,
  ],
};

/** Módulo BD_FLEET — Asignación diaria de rutas. */
export const fleetModule: ModuleConfig = {
  id: 'fleet',
  collection: COLLECTIONS.fleet,
  title: 'Fleet',
  icon: 'Route',
  autoUserField: 'idUsers',
  fields: [
    // Entidad y estación: además de mostrarse en la tabla, son las que
    // permiten limitar por alcance ("Station" en la matriz de Roles). Sin
    // ellas el filtro por estación no tenía contra qué comparar y un BC veía
    // todos los registros.
    ...contextFields(true, true),
    { key: 'route', label: 'Route', type: 'text', required: true },
    {
      key: 'idTruck',
      label: 'Truck',
      type: 'ref',
      refCollection: COLLECTIONS.trucks,
      required: true,
    },
    {
      key: 'idDriver',
      label: 'Driver',
      type: 'ref',
      refCollection: COLLECTIONS.drivers,
      required: true,
    },
    {
      key: 'idScanner',
      label: 'Scanner',
      type: 'ref',
      refCollection: COLLECTIONS.assets,
      refFilter: { field: 'type', value: 'SCANNER' },
    },
    { key: 'gasCard', label: 'Gas card', type: 'text', table: false },
    { key: 'sNumber', label: 'S Number', type: 'text', table: false },
    { key: 'vTruck', label: 'V Truck', type: 'text', table: false },
    { key: 'stop', label: 'Stop', type: 'text' },
    { key: 'observation', label: 'Observations', type: 'textarea', table: false },
    capturedByField,
  ],
};

/** Módulo BD_SHOP — Órdenes de taller. */
export const shopModule: ModuleConfig = {
  id: 'shop',
  collection: COLLECTIONS.shopOrders,
  title: 'Shop',
  icon: 'Wrench',
  autoUserField: 'idUsers',
  fields: [
    { key: 'creationDate', label: 'Creation date', type: 'date', required: true },
    {
      key: 'idTruck',
      label: 'Truck',
      type: 'ref',
      refCollection: COLLECTIONS.trucks,
      required: true,
    },
    {
      key: 'idShopName',
      label: 'Shop',
      type: 'ref',
      refCollection: COLLECTIONS.shopNames,
      required: true,
    },
    ...contextFields(false, false),
    { key: 'estimated', label: 'Estimated amount', type: 'currency', table: false },
    { key: 'budgetParts', label: 'Budget parts', type: 'currency', table: false },
    { key: 'budgetLabor', label: 'Budget labor', type: 'currency', table: false },
    { key: 'budgetTotal', label: 'Budget total', type: 'currency' },
    { key: 'diagnostic', label: 'Diagnostic', type: 'textarea', table: false },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      enumValues: SHOP_STATUS,
      required: true,
      defaultValue: 'ABIERTA',
    },
    { key: 'closedDate', label: 'Closed date', type: 'date', table: false },
    { key: 'warranty', label: 'Warranty', type: 'bool', table: false },
    { key: 'expirationDate', label: 'Warranty exp. date', type: 'date', table: false },
    capturedByField,
  ],
};

/** Renglones del reporte BC (BD_BCREPORTDETAIL). */
/** Tipos de recorrido del BC Report y el tipo de unidad que habilitan. */
export const BC_TYPES = ['TRUCK + SCANNER', 'ONLY TRUCK', 'ONLY SCANNER'] as const;

const BC_TYPE_TO_UNIT: Record<string, string | null> = {
  'TRUCK + SCANNER': null,
  'ONLY TRUCK': 'TRUCK',
  'ONLY SCANNER': 'SCANNER',
};

/**
 * Renglones del BC Report: la captura de mantenimiento PREVENTIVO.
 * Las claves coinciden con las de Maintenance para que cada renglón se
 * copie tal cual al módulo de mantenimiento.
 */
const bcDetailFields: FieldConfig[] = [
  {
    key: 'unitType',
    label: 'Type',
    type: 'enum',
    enumValues: BC_TYPES,
    required: true,
    defaultValue: 'TRUCK + SCANNER',
  },
  {
    key: 'idTruck',
    label: 'Truck',
    type: 'ref',
    refCollection: COLLECTIONS.trucks,
    required: true,
    refFilterFromField: { field: 'unitType', targetField: 'type', map: BC_TYPE_TO_UNIT },
  },
  {
    key: 'mileage',
    label: 'Actual Mileage',
    type: 'number',
    highlight: 'value',
    syncToRefField: { field: 'idTruck', targetField: 'mileage' },
  },
  {
    key: 'nextMant',
    label: 'Next mant (from truck)',
    type: 'number',
    highlight: 'value',
    copyFromRefField: { field: 'idTruck', sourceField: 'nextMant' },
  },
  {
    key: 'diffMileage',
    label: 'Difference mileage',
    type: 'number',
    form: false,
    highlight: 'balance',
    compute: (row) => {
      const next = typeof row.nextMant === 'number' ? row.nextMant : null;
      const mileage = typeof row.mileage === 'number' ? row.mileage : null;
      return next === null || mileage === null ? null : next - mileage;
    },
  },
  { key: 'frontLDriver', label: 'Front L/Driver', type: 'number', table: false },
  { key: 'frontRPass', label: 'Front R/Pass', type: 'number', table: false },
  { key: 'backLDriverOut', label: 'Back L/Driver Out', type: 'number', table: false },
  { key: 'backLDriverIn', label: 'Back L/Driver In', type: 'number', table: false },
  { key: 'backRPassOut', label: 'Back R/Pass Out', type: 'number', table: false },
  { key: 'backRPassIn', label: 'Back R/Pass In', type: 'number', table: false },
  { key: 'vedr', label: 'Vdr', type: 'bool', table: false },
  { key: 'fuses', label: 'Fuses', type: 'bool', table: false },
  { key: 'pouch', label: 'Pouch', type: 'bool', table: false },
  { key: 'fireExt', label: 'Fire ext', type: 'bool', table: false },
  { key: 'triangle', label: 'Triangle', type: 'bool', table: false },
  { key: 'inspection', label: 'Inspection', type: 'bool', table: false },
  { key: 'dolly', label: 'Dolly', type: 'number', table: false },
  {
    key: 'idScanner',
    label: 'Scanner',
    type: 'ref',
    refCollection: COLLECTIONS.assets,
    refFilter: { field: 'type', value: 'SCANNER' },
    table: false,
  },
  { key: 'batteries', label: 'Batteries', type: 'number', table: false },
  {
    key: 'idRoute',
    label: 'Route',
    type: 'ref',
    refCollection: COLLECTIONS.routes,
  },
  { key: 'isClean', label: 'Is clean?', type: 'bool', table: false },
  { key: 'cameraFunction', label: 'Camera Function', type: 'bool', table: false },
  { key: 'observation', label: 'Observation', type: 'textarea', table: false },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    enumValues: MAINTENANCE_STATUS,
    required: true,
    defaultValue: 'Pending',
    badge: true,
  },
];

/** Módulo BD_BCREPORT + BD_BCREPORTDETAIL — maestro-detalle. */
export const bcReportsModule: ModuleConfig = {
  id: 'bcReports',
  collection: COLLECTIONS.bcReports,
  title: 'BC Reports',
  icon: 'ClipboardCheck',
  autoUserField: 'idUsers',
  fields: [
    { key: 'date', label: 'Date', type: 'date', defaultToday: true, required: true },
    ...contextFields(),
    { ...capturedByField, label: 'BC (captured by)' },
  ],
  /** Reporte de mantenimiento del BC: encabezado + renglón en una sola fila. */
  exportRows: {
    collection: COLLECTIONS.maintenance,
    parentKey: 'idBcReport',
    columns: [
      { label: 'Date', from: 'parent', field: { key: 'date', label: 'Date', type: 'date' } },
      {
        label: 'Entity',
        from: 'parent',
        field: {
          key: 'idEntity',
          label: 'Entity',
          type: 'ref',
          refCollection: COLLECTIONS.entities,
        },
      },
      {
        label: 'Station',
        from: 'parent',
        field: {
          key: 'idStation',
          label: 'Station',
          type: 'ref',
          refCollection: COLLECTIONS.stations,
        },
      },
      {
        label: 'Responsable',
        from: 'parent',
        field: {
          key: 'idUsers',
          label: 'Responsable',
          type: 'ref',
          refCollection: COLLECTIONS.users,
        },
      },
      {
        label: 'Observation',
        from: 'row',
        field: { key: 'observation', label: 'Observation', type: 'text' },
      },
      {
        label: 'Route',
        from: 'row',
        field: { key: 'idRoute', label: 'Route', type: 'ref', refCollection: COLLECTIONS.routes },
      },
      {
        label: 'Truck',
        from: 'row',
        field: { key: 'idTruck', label: 'Truck', type: 'ref', refCollection: COLLECTIONS.trucks },
      },
      { label: 'Next mant', from: 'row', field: { key: 'nextMant', label: 'Next mant', type: 'number' } },
      { label: 'Mileage', from: 'row', field: { key: 'mileage', label: 'Mileage', type: 'number' } },
      {
        label: 'Diff Mileage',
        from: 'row',
        field: {
          key: 'diffMileage',
          label: 'Diff Mileage',
          type: 'number',
          compute: (row) => {
            const next = typeof row.nextMant === 'number' ? row.nextMant : null;
            const mileage = typeof row.mileage === 'number' ? row.mileage : null;
            return next === null || mileage === null ? null : next - mileage;
          },
        },
      },
      { label: 'L/Driver', from: 'row', field: { key: 'frontLDriver', label: 'L/Driver', type: 'number' } },
      { label: 'R/Pass', from: 'row', field: { key: 'frontRPass', label: 'R/Pass', type: 'number' } },
      { label: 'Outside', from: 'row', field: { key: 'backLDriverOut', label: 'Outside', type: 'number' } },
      { label: 'Inside', from: 'row', field: { key: 'backLDriverIn', label: 'Inside', type: 'number' } },
      { label: 'Outside', from: 'row', field: { key: 'backRPassOut', label: 'Outside', type: 'number' } },
      { label: 'Inside', from: 'row', field: { key: 'backRPassIn', label: 'Inside', type: 'number' } },
      { label: 'Vedr', from: 'row', field: { key: 'vedr', label: 'Vedr', type: 'bool' } },
      { label: 'Fuses', from: 'row', field: { key: 'fuses', label: 'Fuses', type: 'bool' } },
      { label: 'Pouch', from: 'row', field: { key: 'pouch', label: 'Pouch', type: 'bool' } },
      { label: 'Fire ext', from: 'row', field: { key: 'fireExt', label: 'Fire ext', type: 'bool' } },
      { label: 'Triangle', from: 'row', field: { key: 'triangle', label: 'Triangle', type: 'bool' } },
      { label: 'Inspection', from: 'row', field: { key: 'inspection', label: 'Inspection', type: 'bool' } },
      { label: 'Dolly', from: 'row', field: { key: 'dolly', label: 'Dolly', type: 'number' } },
      {
        label: 'Scanner',
        from: 'row',
        field: {
          key: 'idScanner',
          label: 'Scanner',
          type: 'ref',
          refCollection: COLLECTIONS.assets,
        },
      },
      { label: 'Bateries', from: 'row', field: { key: 'batteries', label: 'Bateries', type: 'number' } },
    ],
  },
  relatedViews: [
    {
      id: 'maintenance',
      title: 'Maintenance of this report',
      collection: COLLECTIONS.maintenance,
      foreignKey: 'idBcReport',
      emptyMessage: 'No maintenance linked to this report yet',
      fields: [
        /**
         * Cada renglón nace preventivo (la revisión diaria del BC). Si el BC
         * detecta una falla puede marcarlo correctivo desde aquí, sin salir a
         * Maintenance: el espejo se crea con ese mismo tipo.
         */
        {
          key: 'type',
          label: 'Maintenance type',
          type: 'enum',
          enumValues: ['Preventive', 'Corrective'],
          required: true,
          defaultValue: 'Preventive',
          badge: true,
          badgeTones: { Preventive: 'warning', Corrective: 'negative' },
        },
        {
          key: 'idTruck',
          label: 'Truck',
          type: 'ref',
          refCollection: COLLECTIONS.trucks,
        },
        {
          key: 'idRoute',
          label: 'Route',
          type: 'ref',
          refCollection: COLLECTIONS.routes,
        },
        { key: 'nextMant', label: 'Next mant', type: 'number' },
        { key: 'mileage', label: 'Mileage', type: 'number' },
        {
          key: 'diffMileage',
          label: 'Diff Mileage',
          type: 'number',
          compute: (row) => {
            const next = typeof row.nextMant === 'number' ? row.nextMant : null;
            const mileage = typeof row.mileage === 'number' ? row.mileage : null;
            return next === null || mileage === null ? null : next - mileage;
          },
        },
        { key: 'frontLDriver', label: 'L/Driver', type: 'number' },
        { key: 'frontRPass', label: 'R/Pass', type: 'number' },
        { key: 'backLDriverOut', label: 'Outside', type: 'number' },
        { key: 'backLDriverIn', label: 'Inside', type: 'number' },
        { key: 'backRPassOut', label: 'Outside', type: 'number' },
        { key: 'backRPassIn', label: 'Inside', type: 'number' },
        { key: 'vedr', label: 'Vedr', type: 'bool' },
        { key: 'fuses', label: 'Fuses', type: 'bool' },
        { key: 'pouch', label: 'Pouch', type: 'bool' },
        { key: 'fireExt', label: 'Fire ext', type: 'bool' },
        { key: 'triangle', label: 'Triangle', type: 'bool' },
        { key: 'inspection', label: 'Inspection', type: 'bool' },
        { key: 'dolly', label: 'Dolly', type: 'number' },
        {
          key: 'idScanner',
          label: 'Scanner',
          type: 'ref',
          refCollection: COLLECTIONS.assets,
        },
        { key: 'batteries', label: 'Bateries', type: 'number' },
        { key: 'observation', label: 'Observation', type: 'text' },
      ],
    },
  ],
  bulkDetailImport: {
    buttonLabel: 'Bulk import',
    title: 'Bulk import · Preventive maintenance',
    groupBy: ['date', 'idUsers', 'idEntity', 'idStation'],
  },
  detail: {
    collection: COLLECTIONS.bcReportDetails,
    parentKey: 'idBcReport',
    title: 'Preventive maintenance',
    fields: bcDetailFields,
    /** Cada renglón se copia a Maintenance marcado con su origen. */
    mirror: {
      collection: COLLECTIONS.maintenance,
      idPrefix: 'bc-',
      build: (parentId, parent, row) => ({
        ...row,
        // El tipo lo decide el renglón; si no viene, es la revisión diaria.
        type: typeof row.type === 'string' && row.type !== '' ? row.type : 'Preventive',
        date: typeof parent.date === 'string' ? parent.date : null,
        idEntity: typeof parent.idEntity === 'string' ? parent.idEntity : null,
        idStation: typeof parent.idStation === 'string' ? parent.idStation : null,
        idUsers: typeof parent.idUsers === 'string' ? parent.idUsers : null,
        origin: 'BC Report',
        idBcReport: parentId,
      }),
    },
  },
};

/** Módulo BD_RENTAL — Rentas. */
export const rentalsModule: ModuleConfig = {
  id: 'rentals',
  collection: COLLECTIONS.rentals,
  title: 'Rentals',
  icon: 'KeySquare',
  autoUserField: 'idUsers',
  fields: [
    {
      key: 'idVendor',
      label: 'Vendor',
      type: 'ref',
      refCollection: COLLECTIONS.vendors,
      required: true,
    },
    { key: 'truckNumber', label: 'Truck number', type: 'text', required: true },
    { key: 'pickupLocation', label: 'Pickup location', type: 'text', table: false },
    { key: 'pickupCity', label: 'Pickup city', type: 'text' },
    { key: 'odometer', label: 'Odometer', type: 'number', table: false },
    { key: 'fedexContract', label: 'FedEx contract', type: 'text', table: false },
    { key: 'agreementNum', label: 'Agreement number', type: 'text', table: false },
    ...contextFields(false, false),
    { key: 'licensePlate', label: 'License plate', type: 'text' },
    { key: 'licenseState', label: 'License state', type: 'text', table: false },
    { key: 'vinNumber', label: 'VIN number', type: 'text', table: false },
    { key: 'vedr', label: 'VEDR', type: 'text', table: false },
    { key: 'fedexTruck', label: 'FedEx truck', type: 'bool', table: false },
    { key: 'fedexNewTruck', label: 'FedEx new truck', type: 'bool', table: false },
    { key: 'ezTagNumber', label: 'EZ Tag number', type: 'text', table: false },
    { key: 'requestedDate', label: 'Requested date', type: 'date' },
    { key: 'endDate', label: 'End date', type: 'date' },
    { key: 'gasCard', label: 'Gas card', type: 'text', table: false },
    { key: 'tdc', label: 'TDC', type: 'text', table: false },
    capturedByField,
  ],
};


/** Solo visible cuando el mantenimiento es de este tipo. */
const whenPreventive = { field: 'type', value: 'Preventive' } as const;
const whenCorrective = { field: 'type', value: 'Corrective' } as const;

/** Módulo Maintenance — preventivo y correctivo en un solo módulo. */
export const maintenanceModule: ModuleConfig = {
  id: 'maintenance',
  collection: COLLECTIONS.maintenance,
  title: 'Maintenance',
  icon: 'Wrench',
  autoUserField: 'idUsers',
  viewTabs: [
    { id: 'all', label: 'All' },
    {
      id: 'preventive',
      label: 'Preventive',
      tone: 'warning',
      match: (row) =>
        row.type === 'Preventive' &&
        !(typeof row.idBcReport === 'string' && row.idBcReport.trim() !== ''),
    },
    {
      id: 'corrective',
      label: 'Corrective',
      tone: 'negative',
      match: (row) => row.type === 'Corrective',
    },
    {
      id: 'fromBc',
      label: 'From BC Report',
      tone: 'info',
      match: (row) => typeof row.idBcReport === 'string' && row.idBcReport.trim() !== '',
    },
  ],
  fields: [
    {
      key: 'type',
      label: 'Type',
      type: 'enum',
      enumValues: ['Preventive', 'Corrective'],
      required: true,
      defaultValue: 'Preventive',
      badge: true,
      // Preventivo ámbar, correctivo rojo.
      badgeTones: { Preventive: 'warning', Corrective: 'negative' },
    },
    { key: 'date', label: 'Date', type: 'date', defaultToday: true, required: true },
    {
      key: 'idEntity',
      label: 'Entity',
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      required: true,
      defaultFromUserScope: 'entity',
      table: false,
    },
    {
      key: 'idStation',
      label: 'Station',
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      required: true,
      defaultFromUserScope: 'station',
      table: false,
    },
    {
      key: 'idTruck',
      label: 'Truck',
      type: 'ref',
      refCollection: COLLECTIONS.trucks,
      required: true,
      refFilterFromField: { field: 'unitType', targetField: 'type', map: BC_TYPE_TO_UNIT },
    },
    {
      key: 'unitType',
      label: 'Type select',
      importAliases: ['Type_select'],
      type: 'enum',
      enumValues: BC_TYPES,
      table: false,
      visibleWhen: whenPreventive,
    },
    {
      key: 'idRoute',
      label: 'Route',
      type: 'ref',
      refCollection: COLLECTIONS.routes,
      table: false,
      visibleWhen: whenPreventive,
    },
    // ---- Preventive ----
    {
      key: 'permitImp',
      label: 'Permit Imp',
      importAliases: ['IMP', 'Imp'],
      type: 'date',
      table: false,
      visibleWhen: whenPreventive,
    },
    {
      key: 'permitReg',
      label: 'Permit Reg',
      importAliases: ['REG', 'Reg'],
      type: 'date',
      table: false,
      visibleWhen: whenPreventive,
    },
    {
      key: 'mileage',
      label: 'Actual Mileage',
      importAliases: ['Mileage'],
      type: 'number',
      table: false,
      highlight: 'value',
      visibleWhen: whenPreventive,
      // El millaje capturado pasa a ser el millaje actual del camión.
      syncToRefField: {
        field: 'idTruck',
        targetField: 'mileage',
        onlyWhen: (row) => row.type === 'Preventive',
      },
    },
    {
      key: 'nextMant',
      label: 'Next mant (from truck)',
      importAliases: ['NEXT mant'],
      type: 'number',
      table: false,
      highlight: 'value',
      visibleWhen: whenPreventive,
      // Se toma del camión elegido; el operador captura el millaje actual.
      copyFromRefField: { field: 'idTruck', sourceField: 'nextMant' },
    },
    {
      key: 'frontLDriver',
      label: 'Front L/Driver',
      importAliases: ['L/Driver'],
      type: 'number',
      table: false,
      visibleWhen: whenPreventive,
    },
    {
      key: 'frontRPass',
      label: 'Front R/Pass',
      importAliases: ['R/Pass'],
      type: 'number',
      table: false,
      visibleWhen: whenPreventive,
    },
    { key: 'backLDriverOut', label: 'Back L/Driver Out', type: 'number', table: false, visibleWhen: whenPreventive },
    { key: 'backLDriverIn', label: 'Back L/Driver In', type: 'number', table: false, visibleWhen: whenPreventive },
    { key: 'backRPassOut', label: 'Back R/Pass Out', type: 'number', table: false, visibleWhen: whenPreventive },
    { key: 'backRPassIn', label: 'Back R/Pass In', type: 'number', table: false, visibleWhen: whenPreventive },
    {
      key: 'vedr',
      label: 'Vedr',
      importAliases: ['Vdr'],
      type: 'bool',
      table: false,
      visibleWhen: whenPreventive,
    },
    { key: 'fuses', label: 'Fuses', type: 'bool', table: false, visibleWhen: whenPreventive },
    { key: 'pouch', label: 'Pouch', type: 'bool', table: false, visibleWhen: whenPreventive },
    { key: 'fireExt', label: 'Fire ext', type: 'bool', table: false, visibleWhen: whenPreventive },
    { key: 'triangle', label: 'Triangle', type: 'bool', table: false, visibleWhen: whenPreventive },
    { key: 'inspection', label: 'Inspection', type: 'bool', table: false, visibleWhen: whenPreventive },
    { key: 'dolly', label: 'Dolly', type: 'number', table: false, visibleWhen: whenPreventive },
    {
      key: 'idScanner',
      label: 'Scanner',
      type: 'ref',
      refCollection: COLLECTIONS.assets,
      refFilter: { field: 'type', value: 'SCANNER' },
      table: false,
      visibleWhen: whenPreventive,
    },
    { key: 'batteries', label: 'Batteries', type: 'number', table: false, visibleWhen: whenPreventive },
    { key: 'isClean', label: 'Is clean?', type: 'bool', table: false, visibleWhen: whenPreventive },
    {
      key: 'cameraFunction',
      label: 'Camera Function',
      type: 'bool',
      table: false,
      visibleWhen: whenPreventive,
    },
    // ---- Corrective (captura manual) ----
    {
      key: 'differenceMileage',
      label: 'Difference Mileage (manual)',
      importAliases: ['difference mileage', 'Difference Mileage'],
      type: 'number',
      table: false,
      visibleWhen: whenCorrective,
    },
    // ---- Calculado para ambos: preventivo = Next mant - Mileage ----
    {
      key: 'diffMileage',
      label: 'Difference mileage',
      type: 'number',
      form: false,
      badge: false,
      highlight: 'balance',
      compute: (row) => {
        if (row.type === 'Preventive') {
          const next = typeof row.nextMant === 'number' ? row.nextMant : null;
          const mil = typeof row.mileage === 'number' ? row.mileage : null;
          if (next === null || mil === null) return null;
          return next - mil;
        }
        return typeof row.differenceMileage === 'number' ? row.differenceMileage : null;
      },
    },
    { key: 'observation', label: 'Observation', type: 'textarea', table: false },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      enumValues: MAINTENANCE_STATUS,
      required: true,
      defaultValue: 'Pending',
      badge: true,
    },
    {
      key: 'origin',
      label: 'Source',
      type: 'text',
      form: false,
      badge: true,
      // El origen se deduce del vínculo: si el registro trae BC report,
      // se capturó desde ahí; si no, se capturó directo en Maintenance.
      compute: (row) => {
        const link = row.idBcReport;
        if (typeof link === 'string' && link.trim() !== '') return 'BC Report';
        return typeof row.origin === 'string' && row.origin !== '' ? row.origin : 'Direct';
      },
      // Lo capturado desde un BC Report se distingue en azul.
      badgeTones: { 'BC Report': 'info', Direct: 'neutral' },
    },
    {
      key: 'idBcReport',
      label: 'BC report',
      importAliases: ['bc report', 'BC Report id', 'idBcReport'],
      type: 'ref',
      refCollection: COLLECTIONS.bcReports,
      form: false,
      importable: true,
      table: false,
    },
    capturedByField,
  ],
};


/** Módulo BD_ACCIDENT — Accidentes. Todos los campos también son columnas. */
/** Sí/No tal como los devuelve el formulario de incidentes. */
const YES_NO = ['Yes', 'No'] as const;

/** El incidente fue una lesión: se pregunta por la persona, no por la unidad. */
const whenInjury = { field: 'incidentType', value: 'Injury' } as const;
/** Hubo un vehículo involucrado: choque o daño a propiedad. */
const whenVehicle = {
  field: 'incidentType',
  valueIn: ['Vehicle Accident', 'Property Damage (mailbox, Grass, Fence, etc.)'],
} as const;
/** Solo choque entre vehículos. */
const whenAccident = { field: 'incidentType', value: 'Vehicle Accident' } as const;
/** Solo daño a propiedad. */
const whenProperty = {
  field: 'incidentType',
  value: 'Property Damage (mailbox, Grass, Fence, etc.)',
} as const;
/** Cualquier otro incidente. */
const whenOther = { field: 'incidentType', value: 'Other' } as const;

/**
 * Módulo BD_ACCIDENTS — estructura del formulario "Incident Report".
 *
 * El orden está pensado para llenarse rápido y desde el teléfono: primero lo
 * que ya viene resuelto (compañía, estación y fecha), luego las tres preguntas
 * que siempre aplican (conductor, unidad, tipo), y de ahí en adelante SOLO el
 * bloque del tipo elegido. Quien reporta una lesión no ve nada de vehículos, y
 * quien reporta un choque no ve las preguntas de daño a propiedad.
 */
export const accidentsModule: ModuleConfig = {
  id: 'accidents',
  collection: COLLECTIONS.accidents,
  title: 'Accidents',
  icon: 'AlertTriangle',
  autoUserField: 'idUsers',
  fields: [
    {
      key: 'timestamp',
      label: 'Timestamp',
      type: 'date',
      form: false,
      table: false,
      compute: (row) => (typeof row.createdAt === 'string' ? row.createdAt.slice(0, 10) : ''),
    },

    // ── Contexto: llega resuelto desde el alcance del usuario ──
    {
      key: 'idEntity',
      label: '1. Company',
      importAliases: ['1. Company and Station number', 'Company', 'Entity'],
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      defaultFromUserScope: 'entity',
      required: true,
      table: false,
    },
    {
      key: 'idStation',
      label: '1. Station number',
      importAliases: ['Station', 'Station number'],
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      defaultFromUserScope: 'station',
      required: true,
      table: false,
    },
    {
      key: 'date',
      label: '2. Date of incident',
      importAliases: ['4. Date of incident'],
      type: 'date',
      defaultToday: true,
      required: true,
    },

    // ── Las tres preguntas que siempre aplican ──
    {
      key: 'idDriver',
      label: '3. Driver',
      importAliases: ['2. Driver Name '],
      type: 'ref',
      refCollection: COLLECTIONS.drivers,
      required: true,
    },
    {
      key: 'incidentType',
      label: '4. What happened?',
      importAliases: ['7. Type of Incident'],
      type: 'enum',
      required: true,
      badge: true,
      badgeTones: {
        Injury: 'negative',
        'Vehicle Accident': 'warning',
        'Property Damage (mailbox, Grass, Fence, etc.)': 'info',
        Other: 'neutral',
      },
      enumValues: [
        'Injury',
        'Vehicle Accident',
        'Property Damage (mailbox, Grass, Fence, etc.)',
        'Other',
      ],
    },
    {
      key: 'description',
      label: '5. Describe what happened',
      importAliases: ['Description of What Happened'],
      type: 'textarea',
      required: true,
      table: false,
    },

    // ── Lesión: la persona, nunca el vehículo ──
    {
      key: 'whoInjured',
      label: 'Who is injured?',
      type: 'enum',
      table: false,
      visibleWhen: whenInjury,
      enumValues: ['Driver', 'Helper', 'Third Party', 'Other'],
    },
    {
      key: 'bodyPart',
      label: 'Body Part Affected',
      type: 'text',
      table: false,
      visibleWhen: whenInjury,
    },
    {
      key: 'injuryDescription',
      label: 'Description of injury',
      type: 'textarea',
      table: false,
      visibleWhen: whenInjury,
    },
    {
      key: 'medicalAttention',
      label: 'Was medical Attention Required?',
      type: 'enum',
      table: false,
      visibleWhen: whenInjury,
      enumValues: YES_NO,
    },
    {
      key: 'emsCalled',
      label: 'Was EMS Called?',
      type: 'enum',
      table: false,
      visibleWhen: whenInjury,
      enumValues: YES_NO,
    },
    {
      key: 'transportedToHospital',
      label: 'Was the Injury person Transported to Hospital or Urgent Care? Concentra?',
      type: 'enum',
      table: false,
      visibleWhen: whenInjury,
      enumValues: YES_NO,
    },

    // ── Unidad: solo cuando hubo un vehículo de por medio ──
    {
      key: 'idTruck',
      label: 'WA / Truck #',
      type: 'ref',
      refCollection: COLLECTIONS.trucks,
      table: false,
      visibleWhen: whenVehicle,
    },
    {
      key: 'address',
      label: 'Address of incident',
      importAliases: ['6. Address of incident '],
      type: 'text',
      table: false,
      visibleWhen: whenVehicle,
    },
    {
      key: 'canContinueRoute',
      label: 'Can the vehicle continue the route?',
      type: 'enum',
      table: false,
      visibleWhen: whenVehicle,
      enumValues: YES_NO,
    },
    {
      key: 'towRequired',
      label: 'Is Tow Service Required?',
      type: 'enum',
      table: false,
      visibleWhen: whenVehicle,
      enumValues: YES_NO,
    },

    // ── Choque: tercero y autoridad ──
    {
      key: 'accidentType',
      label: 'Type Of Accident',
      type: 'enum',
      table: false,
      visibleWhen: whenAccident,
      enumValues: ['Backing', 'Overhead', 'Sideswipe', 'Front to front', 'Rear end', 'Other'],
    },
    {
      key: 'thirdPartyName',
      label: 'Third Party Full Name',
      type: 'text',
      table: false,
      visibleWhen: whenAccident,
    },
    {
      key: 'thirdPartyPhone',
      label: 'Phone Number',
      type: 'text',
      table: false,
      visibleWhen: whenAccident,
    },
    {
      key: 'licensePlate',
      label: 'License Plate Number',
      type: 'text',
      table: false,
      visibleWhen: whenAccident,
    },
    {
      key: 'policeOnScene',
      label: 'Police  on Scene?',
      type: 'enum',
      table: false,
      visibleWhen: whenAccident,
      enumValues: YES_NO,
    },
    {
      key: 'policeReportNumber',
      label: 'Police Report Number (If Available)',
      type: 'text',
      table: false,
      visibleWhen: whenAccident,
    },
    {
      key: 'reportedToFedexAccident',
      label: 'Reported To FedEx?',
      type: 'enum',
      table: false,
      visibleWhen: whenAccident,
      enumValues: YES_NO,
    },

    // ── Daño a propiedad ──
    {
      key: 'propertyDamageType',
      label: 'Type of Property Damage',
      type: 'enum',
      table: false,
      visibleWhen: whenProperty,
      enumValues: ['Mailbox', 'Lawn / Grass', 'Fence', 'Residential Home', 'Business', 'Other'],
    },
    {
      key: 'reportedToFedexProperty',
      label: 'Reported To FedEx? 2',
      type: 'enum',
      table: false,
      visibleWhen: whenProperty,
      enumValues: YES_NO,
    },

    // ── Otro ──
    {
      key: 'idIncidentType',
      label: 'Incident Type',
      type: 'ref',
      refCollection: COLLECTIONS.incidentTypes,
      table: false,
      visibleWhen: whenOther,
    },
    {
      key: 'reportedToFedexOther',
      label: 'Reported To FedEx? 3',
      type: 'enum',
      table: false,
      visibleWhen: whenOther,
      enumValues: YES_NO,
    },

    // ── Cierre del caso: lo llena la oficina, no quien reporta ──
    {
      key: 'incidentTime',
      label: 'Time of Incident',
      importAliases: ['5. Time of Incident'],
      type: 'time',
      table: false,
      hideOnCreate: true,
    },
    {
      key: 'preventable',
      label: 'Preventable or Non-Preventable?',
      type: 'enum',
      badge: true,
      badgeTones: { Preventable: 'negative', 'Non-Preventable': 'positive' },
      enumValues: ['Preventable', 'Non-Preventable'],
      hideOnCreate: true,
    },
    {
      key: 'writeUpReceived',
      label: 'Writte up RECEIVED?',
      type: 'enum',
      table: false,
      enumValues: YES_NO,
      hideOnCreate: true,
    },

    // ── Cobro al conductor: solo roles con permiso "Money fields" ──
    {
      key: 'startPaymentDate',
      label: 'Start Payment Date',
      type: 'date',
      table: false,
      hideOnCreate: true,
      requiresAction: 'verFinanzas',
    },
    {
      key: 'driverTotalAmount',
      label: 'Driver total Amount',
      type: 'currency',
      hideOnCreate: true,
      requiresAction: 'verFinanzas',
    },
    {
      key: 'driverPaymentWeekly',
      label: 'Driver payment Weekly',
      type: 'currency',
      table: false,
      hideOnCreate: true,
      requiresAction: 'verFinanzas',
    },
    {
      key: 'lastPaymentDate',
      label: 'Last payment Date',
      type: 'date',
      form: false,
      table: false,
      requiresAction: 'verFinanzas',
      compute: (row) => {
        const start = typeof row.startPaymentDate === 'string' ? row.startPaymentDate : '';
        const total = typeof row.driverTotalAmount === 'number' ? row.driverTotalAmount : 0;
        const weekly = typeof row.driverPaymentWeekly === 'number' ? row.driverPaymentWeekly : 0;
        if (start === '' || total <= 0 || weekly <= 0) return '';
        const weeks = Math.ceil(total / weekly);
        const last = new Date(`${start}T00:00:00`);
        if (Number.isNaN(last.getTime())) return '';
        last.setDate(last.getDate() + weeks * 7);
        return last.toISOString().slice(0, 10);
      },
    },

    // ── Notas internas de seguimiento: solo roles con permiso "Internal notes" ──
    {
      key: 'update',
      label: 'Follow-up notes',
      importAliases: ['Emiro Update:'],
      type: 'textarea',
      table: false,
      hideOnCreate: true,
      requiresAction: 'verNotas',
    },

    { ...capturedByField, exportable: false },
  ],
  /**
   * Alta en cuatro pasos cortos. Cada pantalla cabe en un teléfono sin hacer
   * scroll y las pestañas que no apliquen al tipo elegido se saltan solas:
   * una lesión pasa directo de "Qué pasó" a "Evidencia".
   */
  formSteps: [
    { id: 'who', title: 'Who', fieldKeys: ['idEntity', 'idStation', 'date', 'idDriver'] },
    {
      id: 'what',
      title: 'What happened',
      fieldKeys: ['incidentType', 'description'],
    },
    {
      id: 'details',
      title: 'Details',
      fieldKeys: [
        'whoInjured',
        'bodyPart',
        'injuryDescription',
        'medicalAttention',
        'emsCalled',
        'transportedToHospital',
        'idTruck',
        'address',
        'canContinueRoute',
        'towRequired',
        'accidentType',
        'thirdPartyName',
        'thirdPartyPhone',
        'licensePlate',
        'policeOnScene',
        'policeReportNumber',
        'reportedToFedexAccident',
        'propertyDamageType',
        'reportedToFedexProperty',
        'idIncidentType',
        'reportedToFedexOther',
      ],
    },
    {
      id: 'followup',
      title: 'Follow-up',
      fieldKeys: [
        'incidentTime',
        'preventable',
        'writeUpReceived',
        'startPaymentDate',
        'driverTotalAmount',
        'driverPaymentWeekly',
        'update',
        'idUsers',
      ],
    },
  ],
  /** Subformulario: la evidencia fotográfica se carga renglón por renglón. */
  detail: {
    collection: COLLECTIONS.accidentPhotos,
    parentKey: 'idAccident',
    title: 'Photos and videos',
    fields: [
      {
        key: 'kind',
        label: 'Type',
        type: 'enum',
        required: true,
        badge: true,
        badgeTones: { 'Scene photo': 'info', 'Additional photo or video': 'neutral' },
        enumValues: ['Scene photo', 'Additional photo or video'],
      },
      { key: 'url', label: 'Link', type: 'text', required: true },
      { key: 'note', label: 'Note', type: 'text' },
    ],
  },
};

/** Módulo BD_REQUERIMENTS + BD_UNIFORM — maestro-detalle. */
export const requirementsModule: ModuleConfig = {
  id: 'requirements',
  collection: COLLECTIONS.requirements,
  title: 'Requirements',
  icon: 'ClipboardList',
  autoUserField: 'idUsers',
  fields: [
    {
      key: 'date',
      label: 'Date',
      type: 'date',
      defaultToday: true,
      required: true,
      // El día de la solicitud lo fija el sistema y queda como constancia:
      // nadie lo puede mover después.
      fixedOnCreate: true,
    },
    {
      key: 'idRequest',
      label: 'Request type',
      type: 'ref',
      refCollection: COLLECTIONS.requestTypes,
      required: true,
    },
    {
      key: 'requestFor',
      label: 'Who is this for?',
      type: 'enum',
      enumValues: ['BC Report', 'Driver'],
      required: true,
      defaultValue: 'BC Report',
      badge: true,
      badgeTones: { 'BC Report': 'info', Driver: 'neutral' },
    },
    {
      key: 'idDriver',
      label: 'Driver',
      type: 'ref',
      refCollection: COLLECTIONS.drivers,
      required: true,
      // Solo se pregunta cuando la solicitud es para un conductor; si es del
      // propio BC, ya queda identificado en "Captured by".
      visibleWhen: { field: 'requestFor', value: 'Driver' },
    },
    {
      key: 'email',
      label: 'Email',
      type: 'text',
      table: false,
      // Solo se pide en las solicitudes de ADP, que es donde hace falta el
      // correo del conductor para darlo de alta en el portal.
      visibleWhen: { field: 'idRequest', refNameIn: ['ADP', 'Adp'] },
    },
    ...contextFields(false, false),
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      enumValues: REQUIREMENT_STATUS,
      required: true,
      defaultValue: 'PENDIENTE',
      // Toda solicitud nace PENDIENTE: se quita del alta y se cambia después
      // desde la edición, para no pedirle al BC un dato que nunca varía.
      hideOnCreate: true,
    },
    capturedByField,
  ],
  detail: {
    collection: COLLECTIONS.uniforms,
    parentKey: 'idRequeriments',
    title: 'Requested uniforms',
    /** La subtabla solo se habilita en solicitudes de uniformes. */
    enabledWhen: { field: 'idRequest', refNameIn: ['Uniforms', 'Uniform', 'Uniformes'] },
    /** Cada salida descuenta del inventario de uniformes. */
    stockControl: {
      entriesCollection: COLLECTIONS.uniformEntries,
      matchKeys: ['idUniformItem', 'idSize'],
      quantityKey: 'quantity',
    },
    fields: [
      {
        key: 'registerDate',
        label: 'Delivery date',
        type: 'date',
        defaultToday: true,
        // El día de la entrega lo fija el sistema: queda como constancia y
        // nadie lo modifica.
        fixedOnCreate: true,
      },
      {
        key: 'idUniformItem',
        label: 'Uniform',
        type: 'ref',
        refCollection: COLLECTIONS.uniformItems,
        required: true,
      },
      {
        key: 'idSize',
        label: 'Size',
        type: 'ref',
        refCollection: COLLECTIONS.sizes,
        required: true,
        // Solo las tallas del tipo que usa la prenda elegida.
        refFilterFromRefField: {
          field: 'idUniformItem',
          sourceField: 'typeSize',
          targetField: 'typeSize',
        },
      },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, defaultValue: 1 },
      { key: 'receivingDate', label: 'Receiving date', type: 'date' },
      {
        key: 'status',
        label: 'Status',
        type: 'text',
        form: false,
        badge: true,
        // Entregado cuando ya tiene fecha de recepción.
        compute: (row) =>
          typeof row.receivingDate === 'string' && row.receivingDate.trim() !== ''
            ? 'Done'
            : 'Pending',
      },
    ],
  },
};

/** Catálogos simples (todas las CAT_ del diagrama). */
const catalogFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
];

/**
 * Categorías de conductor: el código de autorización de trabajo (C08, C11…)
 * no dice nada por sí solo, así que el catálogo guarda también qué significa.
 * Así quien captura elige con criterio en vez de adivinar.
 */
const driverCategoryFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'text' },
];

/** Prendas y tallas: comparten el tipo de talla (numérica o alfabética). */
const typeSizeField: FieldConfig = {
  key: 'typeSize',
  label: 'Type Size',
  type: 'enum',
  enumValues: TYPE_SIZES,
};

const uniformItemFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  typeSizeField,
];

const sizeFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  typeSizeField,
];

/** Team: catálogo de personas con datos de contacto. */
const teamFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'email', label: 'Email Address', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
];


/** Entradas de uniformes al inventario (los ingresos que luego se dan de baja). */
export const uniformEntriesModule: ModuleConfig = {
  id: 'uniformInventory',
  collection: COLLECTIONS.uniformEntries,
  title: 'Uniform entries',
  icon: 'Shirt',
  autoUserField: 'idUsers',
  fields: [
    {
      key: 'date',
      label: 'Entry date',
      type: 'date',
      defaultToday: true,
      required: true,
      // Constancia del día en que entró la mercancía: la pone el sistema y no
      // se edita, ni al registrarla ni después. Para cargar el histórico con
      // sus fechas reales se usa la importación por CSV.
      fixedOnCreate: true,
    },
    {
      key: 'idUniformItem',
      label: 'Uniform',
      type: 'ref',
      refCollection: COLLECTIONS.uniformItems,
      required: true,
    },
    {
      key: 'idSize',
      label: 'Size',
      type: 'ref',
      refCollection: COLLECTIONS.sizes,
      required: true,
      refFilterFromRefField: {
        field: 'idUniformItem',
        sourceField: 'typeSize',
        targetField: 'typeSize',
      },
    },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true, defaultValue: 1 },
    { key: 'observation', label: 'Observation', type: 'textarea', table: false },
    capturedByField,
  ],
};

export const catalogModules: ModuleConfig[] = [
  { id: 'team', collection: COLLECTIONS.team, title: 'Team', icon: 'UsersRound', fields: teamFields },
  { id: 'entities', collection: COLLECTIONS.entities, title: 'Entities', icon: 'Building2', fields: catalogFields },
  { id: 'stations', collection: COLLECTIONS.stations, title: 'Stations', icon: 'MapPin', fields: catalogFields },
  {
    id: 'driverCategories',
    collection: COLLECTIONS.driverCategories,
    title: 'Driver categories',
    icon: 'Tags',
    fields: driverCategoryFields,
  },
  { id: 'shopNames', collection: COLLECTIONS.shopNames, title: 'Shops', icon: 'Store', fields: catalogFields },
  { id: 'vendors', collection: COLLECTIONS.vendors, title: 'Vendors', icon: 'Handshake', fields: catalogFields },
  { id: 'requestTypes', collection: COLLECTIONS.requestTypes, title: 'Request types', icon: 'ListChecks', fields: catalogFields },
  { id: 'uniformItems', collection: COLLECTIONS.uniformItems, title: 'Uniform items', icon: 'Shirt', fields: uniformItemFields },
  { id: 'sizes', collection: COLLECTIONS.sizes, title: 'Sizes', icon: 'Ruler', fields: sizeFields },
  { id: 'routes', collection: COLLECTIONS.routes, title: 'Routes', icon: 'Signpost', fields: catalogFields },
  { id: 'incidentTypes', collection: COLLECTIONS.incidentTypes, title: 'Incident types', icon: 'AlertTriangle', fields: catalogFields },
];

/** Módulos CRUD principales que aparecen en el menú. */
export const CRUD_MODULES: ModuleConfig[] = [
  trucksModule,
  driversModule,
  assetsModule,
  fleetModule,
  shopModule,
  maintenanceModule,
  accidentsModule,
  bcReportsModule,
  rentalsModule,
  requirementsModule,
];

/**
 * Módulo (y por lo tanto ruta) que administra cada colección. Permite abrir
 * el detalle de un registro referenciado desde otro módulo, p. ej. el camión
 * de un mantenimiento.
 */
export const MODULE_BY_COLLECTION: Record<string, string> = Object.fromEntries(
  CRUD_MODULES.map((module) => [module.collection, module.id]),
);

/**
 * Módulos que participan en el sistema de permisos
 * (los CRUD + páginas especiales del sistema).
 */
export const PERMISSION_MODULES: { id: string; title: string }[] = [
  { id: 'dashboard', title: 'Dashboard' },
  ...CRUD_MODULES.map((m) => ({ id: m.id, title: m.title })),
  { id: 'uniformInventory', title: 'Uniform inventory' },
  { id: 'catalogs', title: 'Catalogs' },
  { id: 'users', title: 'Users' },
  { id: 'roles', title: 'Roles' },
  { id: 'customize', title: 'Customization (required fields & layout)' },
  { id: 'capturedBy', title: 'Captured by (edit the capturing user)' },
  { id: 'entityStation', title: 'Entity & Station fields (edit in forms)' },
];

/** Configuración de un módulo a partir de su colección (búsqueda diferida). */
export function moduleByCollection(collection: string): ModuleConfig | undefined {
  return [...CRUD_MODULES, uniformEntriesModule, ...catalogModules].find(
    (module) => module.collection === collection,
  );
}