import type { FieldConfig, ModuleConfig } from '../types/models';
import { COLLECTIONS } from './collections';
import {
  BC_STATUS,
  CHECK_VALUES,
  DOC_STATUS,
  REQUIREMENT_STATUS,
  SHOP_STATUS,
  UNIFORM_SIZES,
} from './enums';

/**
 * Campos de contexto que se repiten en casi todas las tablas
 * (ID_ENTITY / ID_STATION del diagrama). Definidos una sola vez.
 */
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
  },
  {
    key: 'idStation',
    label: 'Station',
    type: 'ref',
    refCollection: COLLECTIONS.stations,
    required,
    table: tablaStation,
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
    { key: 'unitN', label: 'Unit number', type: 'text', required: true },
    { key: 'type', label: 'Unit type', type: 'text', required: true },
    { key: 'status', label: 'Status', type: 'bool', defaultValue: true },
    { key: 'date', label: 'Register date', type: 'date', required: true, table: false },
    {
      key: 'idEntityReg',
      label: 'Register entity',
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      required: true,
      table: false,
    },
    {
      key: 'idStationReg',
      label: 'Register station',
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      required: true,
      table: false,
    },
    {
      key: 'idEntityActual',
      label: 'Current entity',
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      required: true,
    },
    {
      key: 'idStationActual',
      label: 'Current station',
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      required: true,
    },
    { key: 'nextMant', label: 'Next maintenance', type: 'date' },
    { key: 'vMake', label: 'Make', type: 'text', table: false },
    { key: 'vYear', label: 'Year', type: 'number', table: false },
    { key: 'lPlate', label: 'License plate', type: 'text', required: true },
    { key: 'vinNumber', label: 'VIN number', type: 'text', table: false },
    { key: 'ezTagNumber', label: 'EZ Tag number', type: 'text', table: false },
    { key: 'schB', label: 'Schedule B', type: 'text', table: false },
    { key: 'regExpDate', label: 'Registration exp. date', type: 'date', table: false },
    { key: 'inspExpDate', label: 'Inspection exp. date', type: 'date', table: false },
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
    { key: 'name', label: 'Driver name', type: 'text', required: true },
    { key: 'date', label: 'Register date', type: 'date', table: false },
    ...contextFields(),
    {
      key: 'idCategoryDriver',
      label: 'Category',
      type: 'ref',
      refCollection: COLLECTIONS.driverCategories,
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
    {
      key: 'idUsers',
      label: 'Captured by',
      type: 'ref',
      refCollection: COLLECTIONS.users,
      form: false,
    },
  ],
};

/** Módulo BD_ASSET — Assets. */
export const assetsModule: ModuleConfig = {
  id: 'assets',
  collection: COLLECTIONS.assets,
  title: 'Assets',
  icon: 'ScanLine',
  fields: [
    { key: 'type', label: 'Asset type', type: 'text' },
    { key: 'mark', label: 'Make', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'serialNumber', label: 'Serial number', type: 'text' },
    { key: 'date', label: 'Register date', type: 'date', table: false },
    { key: 'status', label: 'Status', type: 'text' },
    {
      key: 'idDriver',
      label: 'Assigned driver',
      type: 'ref',
      refCollection: COLLECTIONS.drivers,
    },
    ...contextFields(false, false, false),
    { key: 'observation', label: 'Observations', type: 'textarea', table: false },
  ],
};

/** Módulo BD_FLEET — Asignación diaria de rutas. */
export const fleetModule: ModuleConfig = {
  id: 'fleet',
  collection: COLLECTIONS.fleet,
  title: 'Fleet',
  icon: 'Route',
  fields: [
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
  ],
};

/** Renglones del reporte BC (BD_BCREPORTDETAIL). */
const bcDetailFields: FieldConfig[] = [
  {
    key: 'idTruck',
    label: 'Truck',
    type: 'ref',
    refCollection: COLLECTIONS.trucks,
    required: true,
  },
  { key: 'type', label: 'Type', type: 'text' },
  { key: 'actualMileage', label: 'Actual mileage', type: 'number' },
  { key: 'nextMant', label: 'Next maintenance', type: 'date', table: false },
  { key: 'frontLeftDriver', label: 'Front left tire (driver)', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'frontRightPass', label: 'Front right tire (passenger)', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'backLeftDriverOut', label: 'Back left outer tire', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'backRightPassOut', label: 'Back right outer tire', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'vdr', label: 'VDR', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'fuses', label: 'Fuses', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'pouch', label: 'Pouch', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'fireExt', label: 'Fire extinguisher', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'triangle', label: 'Triangles', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'inspection', label: 'Inspection', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'dolly', label: 'Dolly', type: 'enum', enumValues: CHECK_VALUES, table: false },
  {
    key: 'idScanner',
    label: 'Scanner',
    type: 'ref',
    refCollection: COLLECTIONS.assets,
    refFilter: { field: 'type', value: 'SCANNER' },
    table: false,
  },
  { key: 'batteries', label: 'Batteries', type: 'enum', enumValues: CHECK_VALUES, table: false },
  {
    key: 'idRoute',
    label: 'Route',
    type: 'ref',
    refCollection: COLLECTIONS.routes,
  },
  { key: 'isClean', label: 'Unit clean', type: 'bool', table: false },
  { key: 'cameraFunction', label: 'Camera working', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'observation', label: 'Observations', type: 'textarea', table: false },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    enumValues: BC_STATUS,
    required: true,
    defaultValue: 'PENDIENTE',
  },
];

/** Módulo BD_BCREPORT + BD_BCREPORTDETAIL — maestro-detalle. */
export const bcReportsModule: ModuleConfig = {
  id: 'bcReports',
  collection: COLLECTIONS.bcReports,
  title: 'BC Reports',
  icon: 'ClipboardCheck',
  autoUserField: 'idUsers',
  fields: [...contextFields()],
  detail: {
    collection: COLLECTIONS.bcReportDetails,
    parentKey: 'idBcReport',
    title: 'Inspection detail',
    fields: bcDetailFields,
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
  ],
};

/** Módulo BD_REQUERIMENTS + BD_UNIFORM — maestro-detalle. */
export const requirementsModule: ModuleConfig = {
  id: 'requirements',
  collection: COLLECTIONS.requirements,
  title: 'Requirements',
  icon: 'ClipboardList',
  autoUserField: 'idUsers',
  fields: [
    { key: 'date', label: 'Date', type: 'date', required: true },
    {
      key: 'idRequest',
      label: 'Request type',
      type: 'ref',
      refCollection: COLLECTIONS.requestTypes,
      required: true,
    },
    {
      key: 'idDriver',
      label: 'Driver',
      type: 'ref',
      refCollection: COLLECTIONS.drivers,
      required: true,
    },
    ...contextFields(false, false),
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      enumValues: REQUIREMENT_STATUS,
      required: true,
      defaultValue: 'PENDIENTE',
    },
  ],
  detail: {
    collection: COLLECTIONS.uniforms,
    parentKey: 'idRequeriments',
    title: 'Requested uniforms',
    fields: [
      {
        key: 'idUniformItem',
        label: 'Item',
        type: 'ref',
        refCollection: COLLECTIONS.uniformItems,
        required: true,
      },
      { key: 'size', label: 'Size', type: 'enum', enumValues: UNIFORM_SIZES, required: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, defaultValue: 1 },
      { key: 'registerDate', label: 'Register date', type: 'date' },
      { key: 'receivingDate', label: 'Receiving date', type: 'date' },
    ],
  },
};

/** Catálogos simples (todas las CAT_ del diagrama). */
const catalogFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
];

export const catalogModules: ModuleConfig[] = [
  { id: 'entities', collection: COLLECTIONS.entities, title: 'Entities', icon: 'Building2', fields: catalogFields },
  { id: 'stations', collection: COLLECTIONS.stations, title: 'Stations', icon: 'MapPin', fields: catalogFields },
  { id: 'driverCategories', collection: COLLECTIONS.driverCategories, title: 'Driver categories', icon: 'Tags', fields: catalogFields },
  { id: 'shopNames', collection: COLLECTIONS.shopNames, title: 'Shops', icon: 'Store', fields: catalogFields },
  { id: 'vendors', collection: COLLECTIONS.vendors, title: 'Vendors', icon: 'Handshake', fields: catalogFields },
  { id: 'requestTypes', collection: COLLECTIONS.requestTypes, title: 'Request types', icon: 'ListChecks', fields: catalogFields },
  { id: 'uniformItems', collection: COLLECTIONS.uniformItems, title: 'Uniform items', icon: 'Shirt', fields: catalogFields },
  { id: 'routes', collection: COLLECTIONS.routes, title: 'Routes', icon: 'Signpost', fields: catalogFields },
];

/** Módulos CRUD principales que aparecen en el menú. */
export const CRUD_MODULES: ModuleConfig[] = [
  trucksModule,
  driversModule,
  assetsModule,
  fleetModule,
  shopModule,
  bcReportsModule,
  rentalsModule,
  requirementsModule,
];

/**
 * Módulos que participan en el sistema de permisos
 * (los CRUD + páginas especiales del sistema).
 */
export const PERMISSION_MODULES: { id: string; title: string }[] = [
  { id: 'dashboard', title: 'Dashboard' },
  ...CRUD_MODULES.map((m) => ({ id: m.id, title: m.title })),
  { id: 'catalogs', title: 'Catalogs' },
  { id: 'users', title: 'Users' },
  { id: 'roles', title: 'Roles' },
];
