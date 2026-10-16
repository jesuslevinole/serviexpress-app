import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../firebase/config';
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

/**
 * El texto del correo, editable por el admin UNA vez por vista.
 *
 * `subject`, `intro` y `outro` admiten variables entre llaves que el
 * SERVIDOR sustituye al enviar (ver TEMPLATE_VARS). La tabla de datos y
 * la lista de cambios no se escriben a mano: se arman solas con lo que
 * tenga el registro, y aquí solo se decide si aparecen.
 */
export interface NotifyTemplate {
  subject: string;
  intro: string;
  outro: string;
  showFields: boolean;
  showChanges: boolean;
}

/** Variables disponibles, con el ejemplo que se le muestra al admin. */
export const TEMPLATE_VARS: { token: string; help: string }[] = [
  { token: '{titulo}', help: 'nombre de la vista (Trucks, Fleet Report…)' },
  { token: '{evento}', help: 'Nuevo registro, Registro editado o la regla que se cumplió' },
  { token: '{registro}', help: 'cómo se identifica el registro (730925 · 10/16/2026)' },
  { token: '{autor}', help: 'quién guardó el registro' },
  { token: '{fecha}', help: 'fecha y hora del guardado, en hora de Texas' },
];

/**
 * Texto de fábrica: es EXACTAMENTE lo que enviaba el sistema antes de
 * que el mensaje fuese editable, así que una vista sin plantilla propia
 * sigue mandando el mismo correo de siempre.
 */
export const DEFAULT_TEMPLATE: NotifyTemplate = {
  subject: '[ServiExpress] {titulo}: {evento} — {registro}',
  intro: '{evento} en {titulo}.',
  outro: 'Aviso automático de ServiExpress Fleet Control. No respondas a este correo.',
  showFields: true,
  showChanges: true,
};

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
  /** Texto del correo. Se edita una vez y queda. */
  template: NotifyTemplate;
}

export const EMPTY_NOTIFY_CONFIG: ModuleNotifyConfig = {
  userIds: [],
  onCreate: true,
  onEdit: false,
  notifyOwner: false,
  rules: [],
  template: DEFAULT_TEMPLATE,
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
    template: parseTemplate(data.template),
  };
}

/**
 * Una vista guardada antes de que el mensaje fuese editable no tiene
 * `template`: se le da el texto de fábrica, campo por campo, para que no
 * quede ningún hueco en blanco en el editor.
 */
function parseTemplate(raw: unknown): NotifyTemplate {
  if (!raw || typeof raw !== 'object') return DEFAULT_TEMPLATE;
  const data = raw as Record<string, unknown>;
  const text = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim() !== '' ? value : fallback;
  return {
    subject: text(data.subject, DEFAULT_TEMPLATE.subject),
    intro: text(data.intro, DEFAULT_TEMPLATE.intro),
    // El cierre SÍ puede quedar vacío a propósito: quien no quiera pie de
    // correo borra el texto, y eso no es un hueco que haya que rellenar.
    outro: typeof data.outro === 'string' ? data.outro : DEFAULT_TEMPLATE.outro,
    showFields: data.showFields !== false,
    showChanges: data.showChanges !== false,
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

/**
 * Correo de prueba A UNO MISMO. Devuelve la razón exacta si no sale, para
 * no quedarse adivinando si el problema es el despliegue, el dominio o la
 * configuración.
 */
export async function sendTestNotification(
  moduleId: string,
): Promise<{ ok: boolean; reason?: string; sentTo?: string }> {
  try {
    const functions = getFunctions(app, 'us-central1');
    const call = httpsCallable<{ moduleId: string }, { ok: boolean; reason?: string; sentTo?: string }>(
      functions,
      'testNotification',
    );
    const result = await call({ moduleId });
    return result.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // El caso más común mientras no se despliega: la función no existe.
    if (/not-found|not found|internal/i.test(message)) {
      return {
        ok: false,
        reason: `No se pudo llamar a la función (${message}). ¿Está desplegada? En la carpeta del proyecto: firebase deploy --only functions`,
      };
    }
    return { ok: false, reason: message };
  }
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
