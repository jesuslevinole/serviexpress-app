import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../firebase/config';

/**
 * Avisos por correo al guardar formularios. El admin elige POR MÓDULO qué
 * usuarios reciben el aviso (botón "Email on save"); sin lista configurada
 * no se envía nada. El envío real lo hace la Cloud Function
 * notifyModuleSave, que LEE esta misma configuración en el servidor — el
 * navegador nunca decide destinatarios ni toca la API de correo.
 */
const CONFIG_COLLECTION = 'settings_notifications';

export interface ModuleNotifyConfig {
  userIds: string[];
  /** Avisar al CREAR un registro (encendido por defecto al configurar). */
  onCreate: boolean;
  /** Avisar también al EDITAR. */
  onEdit: boolean;
}

/** Caché en memoria por módulo (se invalida al guardar desde el modal). */
const configCache = new Map<string, ModuleNotifyConfig | null>();

function parseConfig(raw: unknown): ModuleNotifyConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const userIds = Array.isArray(data.userIds) ? data.userIds.map(String) : [];
  return {
    userIds,
    onCreate: data.onCreate !== false,
    onEdit: data.onEdit === true,
  };
}

/** Configuración del módulo, con caché (1 lectura por módulo y sesión). */
export async function getModuleNotifyConfig(moduleId: string): Promise<ModuleNotifyConfig | null> {
  if (configCache.has(moduleId)) return configCache.get(moduleId) ?? null;
  try {
    const snapshot = await getDoc(doc(db, CONFIG_COLLECTION, moduleId));
    const parsed = snapshot.exists() ? parseConfig(snapshot.data()) : null;
    configCache.set(moduleId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/** Suscripción viva SOLO para el modal de configuración. */
export function subscribeModuleNotifyConfig(
  moduleId: string,
  onData: (config: ModuleNotifyConfig | null) => void,
): () => void {
  return onSnapshot(
    doc(db, CONFIG_COLLECTION, moduleId),
    (snapshot) => onData(snapshot.exists() ? parseConfig(snapshot.data()) : null),
    () => onData(null),
  );
}

export async function saveModuleNotifyConfig(
  moduleId: string,
  config: ModuleNotifyConfig,
  updatedBy: string | null,
): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, moduleId), {
    ...config,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
  configCache.set(moduleId, config);
}

/**
 * Dispara el aviso tras un guardado exitoso. NUNCA bloquea ni rompe el
 * guardado: cualquier error queda en consola.
 */
export function notifyModuleSave(payload: {
  moduleId: string;
  moduleTitle: string;
  action: 'create' | 'update';
  recordLabel: string;
  summary: string;
}): void {
  void (async () => {
    try {
      const config = await getModuleNotifyConfig(payload.moduleId);
      if (!config || config.userIds.length === 0) return;
      if (payload.action === 'create' && !config.onCreate) return;
      if (payload.action === 'update' && !config.onEdit) return;
      const functions = getFunctions(app, 'us-central1');
      const call = httpsCallable(functions, 'notifyModuleSave');
      await call(payload);
    } catch (error) {
      console.warn('[notify] el aviso por correo no se pudo enviar', error);
    }
  })();
}
