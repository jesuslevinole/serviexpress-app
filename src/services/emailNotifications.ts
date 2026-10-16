import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { ModuleConfig } from '../types/models';

/**
 * AVISOS AUTOMÁTICOS POR CORREO
 *
 * El admin elige POR VISTA quién recibe el aviso y ante qué evento. El envío
 * lo hace Firestore en el SERVIDOR (Cloud Functions), no el navegador: si
 * quien guarda cierra la pestaña, o el registro entra por una importación,
 * el correo sale igual.
 *
 * Este archivo solo LEE y GUARDA la configuración. Junto con los
 * destinatarios se guarda lo que el servidor necesita para armar el correo
 * (colección, título, campos con sus etiquetas y cuáles son referencias),
 * porque la función no conoce la configuración de los módulos.
 */
const CONFIG_COLLECTION = 'settings_notifications';

/** "Cuando Status pase a APROBADO, avisa." */
export interface NotifyRule {
  field: string;
  to: string;
  label: string;
}

export interface ModuleNotifyConfig {
  userIds: string[];
  /** Avisar al CREAR un registro. */
  onCreate: boolean;
  /** Avisar también al EDITAR cualquier campo. */
  onEdit: boolean;
  /** Avisar además a quien capturó el registro. */
  notifyOwner: boolean;
  /** Eventos con nombre propio (aprobaciones, cambios de estatus). */
  rules: NotifyRule[];
}

export const EMPTY_NOTIFY_CONFIG: ModuleNotifyConfig = {
  userIds: [],
  onCreate: true,
  onEdit: false,
  notifyOwner: false,
  rules: [],
};

function parseConfig(raw: unknown): ModuleNotifyConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const rules = Array.isArray(data.rules)
    ? data.rules
        .map((item) => {
          const rule = item as Record<string, unknown>;
          return {
            field: String(rule.field ?? ''),
            to: String(rule.to ?? ''),
            label: String(rule.label ?? ''),
          };
        })
        .filter((rule) => rule.field !== '' && rule.to !== '')
    : [];
  return {
    userIds: Array.isArray(data.userIds) ? data.userIds.map(String) : [],
    onCreate: data.onCreate !== false,
    onEdit: data.onEdit === true,
    notifyOwner: data.notifyOwner === true,
    rules,
  };
}

/** Suscripción viva (solo la usa el modal de configuración). */
export function subscribeModuleNotifyConfig(
  moduleId: string,
  onData: (config: ModuleNotifyConfig | null) => void,
  onError?: (message: string) => void,
): () => void {
  return onSnapshot(
    doc(db, CONFIG_COLLECTION, moduleId),
    (snapshot) => onData(snapshot.exists() ? parseConfig(snapshot.data()) : null),
    (error) => {
      onData(null);
      onError?.(error.message);
    },
  );
}

/**
 * Campos que viajan en el correo, con su etiqueta y, si son referencia, la
 * colección de donde el servidor sacará el nombre (el camión 7f3a… no le
 * dice nada a nadie; "730925" sí).
 */
function mailFieldsOf(config: ModuleConfig) {
  return config.fields
    .filter((field) => field.compute === undefined && field.key !== '__capturedAt')
    .slice(0, 22)
    .map((field) => ({
      key: field.key,
      label: field.label,
      ...(field.refCollection ? { ref: field.refCollection } : {}),
    }));
}

/** Con qué se identifica el registro en el asunto ("730925 · 10/16/2026"). */
function labelKeysOf(config: ModuleConfig): string[] {
  const keys: string[] = [];
  const unique = config.uniqueBy?.field;
  if (unique) keys.push(unique);
  const firstRef = config.fields.find(
    (field) => field.type === 'ref' && field.key !== config.autoUserField,
  );
  if (firstRef && !keys.includes(firstRef.key)) keys.push(firstRef.key);
  const date = config.fields.find((field) => field.type === 'date');
  if (date && !keys.includes(date.key)) keys.push(date.key);
  return keys.slice(0, 3);
}

export async function saveModuleNotifyConfig(
  module: ModuleConfig,
  config: ModuleNotifyConfig,
  updatedBy: string | null,
): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, module.id), {
    ...config,
    // Lo que el servidor necesita para armar y dirigir el correo.
    collection: module.collection,
    title: module.title,
    ownerKey: module.autoUserField ?? null,
    labelKeys: labelKeysOf(module),
    fields: mailFieldsOf(module),
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}
