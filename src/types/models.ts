/**
 * Valor primitivo que puede vivir en un documento de Firestore dentro del app.
 * (Las fechas se guardan como string ISO "YYYY-MM-DD".)
 */
export type FieldValue = string | number | boolean | null;

/** Registro genérico con el que trabaja el motor CRUD. */
export interface EntityData {
  id: string;
  [key: string]: FieldValue | string[];
}

/** Acciones disponibles por módulo. */
export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';

/** Visibilidad de registros por módulo, definida por rol. */
export type ViewScope = 'all' | 'own' | 'station' | 'entity_station';

export type ModulePermissions = Partial<Record<PermissionAction, boolean>> & {
  /** all = todos · own = solo sus registros · station = los de sus estaciones ·
      entity_station = los que coinciden con su estación Y entidad. */
  alcance?: ViewScope;
};

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, ModulePermissions>;
}

/** Perfil en la colección `users` (id = uid de Firebase Auth). Origen: BD_USERS. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: string;
  /** Entidades asignadas: el usuario solo ve registros de estas entidades. */
  scopeEntities?: string[];
  /** Estaciones asignadas: el usuario solo ve registros de estas estaciones. */
  scopeStations?: string[];
  /** Office: acceso a los registros de TODAS las entidades y estaciones. */
  isOffice?: boolean;
}

/** Tipos de campo soportados por el motor de formularios. */
export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'textarea'
  | 'bool'
  | 'enum'
  | 'ref';

export interface RefFilter {
  field: string;
  value: FieldValue;
}

export interface FieldConfig {
  /** Clave del campo en el documento (camelCase del nombre de columna original). */
  key: string;
  /** Etiqueta que se muestra en formularios, tablas y Excel. */
  label: string;
  type: FieldType;
  required?: boolean;
  /** Valores permitidos cuando type === 'enum'. */
  enumValues?: readonly string[];
  /** Colección referenciada cuando type === 'ref' (se muestra el nombre, nunca el id). */
  refCollection?: string;
  /** Filtro opcional para las opciones del ref (p. ej. solo assets tipo SCANNER). */
  refFilter?: RefFilter;
  /** false = no aparece como columna en la tabla (sí en el formulario y el Excel). */
  table?: boolean;
  /** false = no aparece en el formulario: lo llena el sistema (p. ej. capturista). */
  form?: boolean;
  /**
   * true = aunque el sistema lo llene (form:false), sí aparece en la plantilla
   * y en la importación CSV, para poder migrar el dato original.
   */
  importable?: boolean;
  /**
   * Otros nombres de columna que este campo acepta al importar
   * (encabezados tal como salen de AppSheet).
   */
  importAliases?: string[];
  /** Campo calculado en vivo (no se guarda ni se captura): OK/ALERT/CAUTION, etc. */
  compute?: (row: EntityData) => FieldValue;
  /** Renderizar el valor como badge de color en tablas y detalle. */
  badge?: boolean;
  /** El campo solo aparece en el formulario cuando otro campo tiene cierto valor. */
  visibleWhen?: { field: string; value: FieldValue };
  /** Valor inicial tomado de las asignaciones del usuario (primera de su alcance). */
  defaultFromUserScope?: 'entity' | 'station';
  /**
   * Al guardar, copia el NOMBRE resuelto de esta referencia en otra clave del
   * documento. Sirve para que otros módulos sigan mostrando el nombre sin
   * tener que leer la colección referenciada.
   */
  copyLabelTo?: string;
  /**
   * Si este campo está vacío o no se puede resolver, se muestra el valor de
   * esta otra clave. Sirve durante migraciones (dato viejo en otro campo).
   */
  fallbackField?: string;
  /**
   * Filtra las opciones según el valor actual de OTRO campo del mismo formulario.
   * map traduce ese valor al valor a filtrar (null = sin filtro).
   */
  refFilterFromField?: {
    field: string;
    targetField: string;
    map: Record<string, string | null>;
  };
  /**
   * Filtra las opciones usando un dato del REGISTRO referenciado por otro campo.
   * Ej.: las tallas se limitan al tipo de talla de la prenda elegida.
   */
  refFilterFromRefField?: {
    /** Campo del formulario que apunta a otro registro. */
    field: string;
    /** Clave a leer en ese registro. */
    sourceField: string;
    /** Clave a comparar en las opciones de este campo. */
    targetField: string;
  };
  /** Valor por defecto al crear. */
  defaultValue?: FieldValue;
}

export interface DetailConfig {
  /** Colección de los renglones de detalle. */
  collection: string;
  /** Campo del detalle que apunta al id del registro maestro. */
  parentKey: string;
  title: string;
  fields: FieldConfig[];
  /**
   * El detalle solo se habilita cuando el campo indicado apunta a un registro
   * cuyo nombre está en la lista (p. ej. tipo de solicitud = "Uniforms").
   */
  enabledWhen?: { field: string; refNameIn: string[] };
  /**
   * Descuenta de un inventario: antes de guardar valida que haya existencia
   * suficiente (entradas menos salidas ya registradas).
   */
  stockControl?: {
    /** Colección de entradas al inventario. */
    entriesCollection: string;
    /** Claves que identifican el artículo (deben existir en ambas colecciones). */
    matchKeys: string[];
    /** Clave de la cantidad. */
    quantityKey: string;
  };
  /**
   * Copia cada renglón a otra colección (p. ej. los renglones del BC Report
   * también viven en Maintenance, marcados con su origen).
   */
  mirror?: {
    collection: string;
    /** Prefijo del id del documento espejo: `${prefix}${idDelRenglón}`. */
    idPrefix: string;
    build: (
      parentId: string,
      parent: EntityData,
      row: Record<string, FieldValue>,
    ) => Record<string, FieldValue>;
  };
}

/** Lista de solo lectura ligada al registro (historial, movimientos, etc.). */
export interface RelatedView {
  id: string;
  title: string;
  collection: string;
  /** Campo de la otra colección que apunta al id de este registro. */
  foreignKey: string;
  fields: FieldConfig[];
  /** Filtro fijo opcional (p. ej. solo mantenimiento correctivo). */
  filter?: { field: string; value: FieldValue };
  emptyMessage?: string;
}

/** Bitácora automática de cambios en ciertos campos del módulo. */
export interface ChangeLogConfig {
  collection: string;
  /** Campo de la bitácora que apunta al id del registro. */
  foreignKey: string;
  /** Claves de los campos vigilados. */
  watch: string[];
}

export interface ModuleConfig {
  /** Id estable del módulo (se usa en permisos y rutas). */
  id: string;
  collection: string;
  title: string;
  /** Nombre del ícono de lucide-react. */
  icon: string;
  fields: FieldConfig[];
  /** Si se define, este campo se llena automáticamente con el uid del usuario actual. */
  autoUserField?: string;
  /** Módulo de detalle (maestro–detalle), p. ej. renglones del reporte BC. */
  detail?: DetailConfig;
  /** Listas de solo lectura que se abren desde cada renglón. */
  relatedViews?: RelatedView[];
  /** Registra automáticamente los cambios de los campos vigilados. */
  changeLog?: ChangeLogConfig;
  /**
   * Importación masiva de renglones de detalle en un solo CSV: cada fila trae
   * también los datos del encabezado y el sistema agrupa por `groupBy`,
   * creando o reutilizando el registro maestro que corresponda.
   */
  bulkDetailImport?: {
    buttonLabel: string;
    title: string;
    /** Claves del encabezado que identifican un mismo registro maestro. */
    groupBy: string[];
  };
}