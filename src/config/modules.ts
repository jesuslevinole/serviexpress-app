import type { FieldConfig, ModuleConfig } from '../types/models';
import { COLLECTIONS } from './collections';
import {
  ASSET_STATUS,
  ASSET_TYPES,
  BC_STATUS,
  CHECK_VALUES,
  DOC_STATUS,
  DRIVER_STATUS,
  REQUIREMENT_STATUS,
  SHOP_STATUS,
  TRUCK_STATUS,
  TRUCK_TYPES,
  UNIFORM_SIZES,
} from './enums';

/**
 * Campos de contexto que se repiten en casi todas las tablas
 * (ID_ENTITY / ID_STATION del diagrama). Definidos una sola vez.
 */
const contextFields = (tablaEntity = true, tablaStation = true): FieldConfig[] => [
  {
    key: 'idEntity',
    label: 'Entidad',
    type: 'ref',
    refCollection: COLLECTIONS.entities,
    required: true,
    table: tablaEntity,
  },
  {
    key: 'idStation',
    label: 'Estación',
    type: 'ref',
    refCollection: COLLECTIONS.stations,
    required: true,
    table: tablaStation,
  },
];

/** Módulo BD_TRUCK — Camiones. */
export const trucksModule: ModuleConfig = {
  id: 'trucks',
  collection: COLLECTIONS.trucks,
  title: 'Camiones',
  icon: 'Truck',
  autoUserField: 'idUsers',
  fields: [
    { key: 'unitN', label: 'Número de unidad', type: 'text', required: true },
    { key: 'type', label: 'Tipo de unidad', type: 'enum', enumValues: TRUCK_TYPES, required: true },
    { key: 'status', label: 'Estatus', type: 'enum', enumValues: TRUCK_STATUS, required: true, defaultValue: 'ACTIVO' },
    { key: 'date', label: 'Fecha de registro', type: 'date', required: true, table: false },
    {
      key: 'idEntityReg',
      label: 'Entidad de registro',
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      required: true,
      table: false,
    },
    {
      key: 'idStationReg',
      label: 'Estación de registro',
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      required: true,
      table: false,
    },
    {
      key: 'idEntityActual',
      label: 'Entidad actual',
      type: 'ref',
      refCollection: COLLECTIONS.entities,
      required: true,
    },
    {
      key: 'idStationActual',
      label: 'Estación actual',
      type: 'ref',
      refCollection: COLLECTIONS.stations,
      required: true,
    },
    { key: 'nextMant', label: 'Próximo mantenimiento', type: 'date' },
    { key: 'vMake', label: 'Marca', type: 'text', table: false },
    { key: 'vYear', label: 'Año', type: 'number', table: false },
    { key: 'lPlate', label: 'Placa', type: 'text', required: true },
    { key: 'vinNumber', label: 'Número VIN', type: 'text', table: false },
    { key: 'ezTagNumber', label: 'Número EZ Tag', type: 'text', table: false },
    { key: 'schB', label: 'Schedule B', type: 'text', table: false },
    { key: 'regExpDate', label: 'Vence registro', type: 'date', table: false },
    { key: 'inspExpDate', label: 'Vence inspección', type: 'date', table: false },
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
    { key: 'name', label: 'Nombre del driver', type: 'text', required: true },
    { key: 'date', label: 'Fecha de registro', type: 'date', table: false },
    ...contextFields(),
    {
      key: 'idCategoryDriver',
      label: 'Categoría',
      type: 'ref',
      refCollection: COLLECTIONS.driverCategories,
      required: true,
    },
    { key: 'fa', label: 'FA', type: 'text', table: false },
    { key: 'sta', label: 'STA', type: 'text', table: false },
    { key: 'status', label: 'Estatus', type: 'enum', enumValues: DRIVER_STATUS, required: true, defaultValue: 'ACTIVO' },
    { key: 'hiringDate', label: 'Fecha de contratación', type: 'date', table: false },
    { key: 'insurance', label: 'Aseguradora', type: 'text', table: false },
    { key: 'fedexId', label: 'FedEx ID', type: 'text' },
    { key: 'dlNumber', label: 'Número de licencia', type: 'text', table: false },
    { key: 'dlAprobationDate', label: 'Aprobación de licencia', type: 'date', table: false },
    { key: 'dlStatus', label: 'Estatus licencia', type: 'enum', enumValues: DOC_STATUS, table: false },
    { key: 'dot', label: 'DOT', type: 'text', table: false },
    { key: 'dotStatus', label: 'Estatus DOT', type: 'enum', enumValues: DOC_STATUS, table: false },
    { key: 'qc', label: 'QC', type: 'text', table: false },
    { key: 'qcStatus', label: 'Estatus QC', type: 'enum', enumValues: DOC_STATUS, table: false },
    { key: 'eaExpDate', label: 'Vence EA', type: 'date', table: false },
  ],
};

/** Módulo BD_ASSET — Assets. */
export const assetsModule: ModuleConfig = {
  id: 'assets',
  collection: COLLECTIONS.assets,
  title: 'Assets',
  icon: 'ScanLine',
  fields: [
    { key: 'type', label: 'Tipo de asset', type: 'enum', enumValues: ASSET_TYPES, required: true },
    { key: 'mark', label: 'Marca', type: 'text' },
    { key: 'model', label: 'Modelo', type: 'text' },
    { key: 'serialNumber', label: 'Número de serie', type: 'text', required: true },
    { key: 'date', label: 'Fecha de registro', type: 'date', table: false },
    {
      key: 'status',
      label: 'Estatus',
      type: 'enum',
      enumValues: ASSET_STATUS,
      required: true,
      defaultValue: 'DISPONIBLE',
    },
    {
      key: 'idDriver',
      label: 'Driver asignado',
      type: 'ref',
      refCollection: COLLECTIONS.drivers,
    },
    ...contextFields(false, false),
    { key: 'observation', label: 'Observaciones', type: 'textarea', table: false },
  ],
};

/** Módulo BD_FLEET — Asignación diaria de rutas. */
export const fleetModule: ModuleConfig = {
  id: 'fleet',
  collection: COLLECTIONS.fleet,
  title: 'Fleet',
  icon: 'Route',
  fields: [
    { key: 'route', label: 'Ruta', type: 'text', required: true },
    {
      key: 'idTruck',
      label: 'Camión',
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
    { key: 'observation', label: 'Observaciones', type: 'textarea', table: false },
  ],
};

/** Módulo BD_SHOP — Órdenes de taller. */
export const shopModule: ModuleConfig = {
  id: 'shop',
  collection: COLLECTIONS.shopOrders,
  title: 'Taller',
  icon: 'Wrench',
  autoUserField: 'idUsers',
  fields: [
    { key: 'creationDate', label: 'Fecha de creación', type: 'date', required: true },
    {
      key: 'idTruck',
      label: 'Camión',
      type: 'ref',
      refCollection: COLLECTIONS.trucks,
      required: true,
    },
    {
      key: 'idShopName',
      label: 'Taller',
      type: 'ref',
      refCollection: COLLECTIONS.shopNames,
      required: true,
    },
    ...contextFields(false, false),
    { key: 'estimated', label: 'Monto estimado', type: 'currency', table: false },
    { key: 'budgetParts', label: 'Presupuesto partes', type: 'currency', table: false },
    { key: 'budgetLabor', label: 'Presupuesto mano de obra', type: 'currency', table: false },
    { key: 'budgetTotal', label: 'Presupuesto total', type: 'currency' },
    { key: 'diagnostic', label: 'Diagnóstico', type: 'textarea', table: false },
    {
      key: 'status',
      label: 'Estatus',
      type: 'enum',
      enumValues: SHOP_STATUS,
      required: true,
      defaultValue: 'ABIERTA',
    },
    { key: 'closedDate', label: 'Fecha de cierre', type: 'date', table: false },
    { key: 'warranty', label: 'Garantía', type: 'bool', table: false },
    { key: 'expirationDate', label: 'Vence garantía', type: 'date', table: false },
  ],
};

/** Renglones del reporte BC (BD_BCREPORTDETAIL). */
const bcDetailFields: FieldConfig[] = [
  {
    key: 'idTruck',
    label: 'Camión',
    type: 'ref',
    refCollection: COLLECTIONS.trucks,
    required: true,
  },
  { key: 'type', label: 'Tipo', type: 'enum', enumValues: TRUCK_TYPES },
  { key: 'actualMileage', label: 'Millaje actual', type: 'number' },
  { key: 'nextMant', label: 'Próximo mantenimiento', type: 'date', table: false },
  { key: 'frontLeftDriver', label: 'Llanta del. izq (driver)', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'frontRightPass', label: 'Llanta del. der (pasajero)', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'backLeftDriverOut', label: 'Llanta tras. izq exterior', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'backRightPassOut', label: 'Llanta tras. der exterior', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'vdr', label: 'VDR', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'fuses', label: 'Fusibles', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'pouch', label: 'Pouch', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'fireExt', label: 'Extintor', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'triangle', label: 'Triángulos', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'inspection', label: 'Inspección', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'dolly', label: 'Dolly', type: 'enum', enumValues: CHECK_VALUES, table: false },
  {
    key: 'idScanner',
    label: 'Scanner',
    type: 'ref',
    refCollection: COLLECTIONS.assets,
    refFilter: { field: 'type', value: 'SCANNER' },
    table: false,
  },
  { key: 'batteries', label: 'Baterías', type: 'enum', enumValues: CHECK_VALUES, table: false },
  {
    key: 'idRoute',
    label: 'Ruta',
    type: 'ref',
    refCollection: COLLECTIONS.routes,
  },
  { key: 'isClean', label: 'Unidad limpia', type: 'bool', table: false },
  { key: 'cameraFunction', label: 'Cámara funcionando', type: 'enum', enumValues: CHECK_VALUES, table: false },
  { key: 'observation', label: 'Observaciones', type: 'textarea', table: false },
  {
    key: 'status',
    label: 'Estatus',
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
  title: 'Reportes BC',
  icon: 'ClipboardCheck',
  autoUserField: 'idUsers',
  fields: [...contextFields()],
  detail: {
    collection: COLLECTIONS.bcReportDetails,
    parentKey: 'idBcReport',
    title: 'Detalle de inspección',
    fields: bcDetailFields,
  },
};

/** Módulo BD_RENTAL — Rentas. */
export const rentalsModule: ModuleConfig = {
  id: 'rentals',
  collection: COLLECTIONS.rentals,
  title: 'Rentas',
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
    { key: 'truckNumber', label: 'Número de camión', type: 'text', required: true },
    { key: 'pickupLocation', label: 'Lugar de pickup', type: 'text', table: false },
    { key: 'pickupCity', label: 'Ciudad de pickup', type: 'text' },
    { key: 'odometer', label: 'Odómetro', type: 'number', table: false },
    { key: 'fedexContract', label: 'Contrato FedEx', type: 'text', table: false },
    { key: 'agreementNum', label: 'Número de contrato', type: 'text', table: false },
    ...contextFields(false, false),
    { key: 'licensePlate', label: 'Placa', type: 'text' },
    { key: 'licenseState', label: 'Estado de la placa', type: 'text', table: false },
    { key: 'vinNumber', label: 'Número VIN', type: 'text', table: false },
    { key: 'vedr', label: 'VEDR', type: 'text', table: false },
    { key: 'fedexTruck', label: 'Camión FedEx', type: 'bool', table: false },
    { key: 'fedexNewTruck', label: 'Camión FedEx nuevo', type: 'bool', table: false },
    { key: 'ezTagNumber', label: 'Número EZ Tag', type: 'text', table: false },
    { key: 'requestedDate', label: 'Fecha solicitada', type: 'date' },
    { key: 'endDate', label: 'Fecha de término', type: 'date' },
    { key: 'gasCard', label: 'Gas card', type: 'text', table: false },
    { key: 'tdc', label: 'TDC', type: 'text', table: false },
  ],
};

/** Módulo BD_REQUERIMENTS + BD_UNIFORM — maestro-detalle. */
export const requirementsModule: ModuleConfig = {
  id: 'requirements',
  collection: COLLECTIONS.requirements,
  title: 'Requerimientos',
  icon: 'ClipboardList',
  autoUserField: 'idUsers',
  fields: [
    { key: 'date', label: 'Fecha', type: 'date', required: true },
    {
      key: 'idRequest',
      label: 'Tipo de solicitud',
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
      label: 'Estatus',
      type: 'enum',
      enumValues: REQUIREMENT_STATUS,
      required: true,
      defaultValue: 'PENDIENTE',
    },
  ],
  detail: {
    collection: COLLECTIONS.uniforms,
    parentKey: 'idRequeriments',
    title: 'Uniformes solicitados',
    fields: [
      {
        key: 'idUniformItem',
        label: 'Artículo',
        type: 'ref',
        refCollection: COLLECTIONS.uniformItems,
        required: true,
      },
      { key: 'size', label: 'Talla', type: 'enum', enumValues: UNIFORM_SIZES, required: true },
      { key: 'quantity', label: 'Cantidad', type: 'number', required: true, defaultValue: 1 },
      { key: 'registerDate', label: 'Fecha de registro', type: 'date' },
      { key: 'receivingDate', label: 'Fecha de recepción', type: 'date' },
    ],
  },
};

/** Catálogos simples (todas las CAT_ del diagrama). */
const catalogFields: FieldConfig[] = [
  { key: 'name', label: 'Nombre', type: 'text', required: true },
];

export const catalogModules: ModuleConfig[] = [
  { id: 'entities', collection: COLLECTIONS.entities, title: 'Entidades', icon: 'Building2', fields: catalogFields },
  { id: 'stations', collection: COLLECTIONS.stations, title: 'Estaciones', icon: 'MapPin', fields: catalogFields },
  { id: 'driverCategories', collection: COLLECTIONS.driverCategories, title: 'Categorías de driver', icon: 'Tags', fields: catalogFields },
  { id: 'shopNames', collection: COLLECTIONS.shopNames, title: 'Talleres', icon: 'Store', fields: catalogFields },
  { id: 'vendors', collection: COLLECTIONS.vendors, title: 'Vendors', icon: 'Handshake', fields: catalogFields },
  { id: 'requestTypes', collection: COLLECTIONS.requestTypes, title: 'Tipos de solicitud', icon: 'ListChecks', fields: catalogFields },
  { id: 'uniformItems', collection: COLLECTIONS.uniformItems, title: 'Artículos de uniforme', icon: 'Shirt', fields: catalogFields },
  { id: 'routes', collection: COLLECTIONS.routes, title: 'Rutas', icon: 'Signpost', fields: catalogFields },
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
  { id: 'catalogs', title: 'Catálogos' },
  { id: 'users', title: 'Usuarios' },
  { id: 'roles', title: 'Roles' },
];
