/**
 * Valor primitivo que puede vivir en un documento de Firestore dentro del app.
 * (Las fechas se guardan como string ISO "YYYY-MM-DD".)
 */
export type FieldValue = string | number | boolean | null;

/** Registro genérico con el que trabaja el motor CRUD. */
export interface EntityData {
  id: string;
  [key: string]: FieldValue;
}

/** Acciones disponibles por módulo. */
export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';

export type ModulePermissions = Partial<Record<PermissionAction, boolean>>;

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
}
