import { initializeApp, deleteApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { COLLECTIONS } from '../config/collections';
import { setDocument } from './firestoreService';

/**
 * Contraseña temporal aleatoria y fuerte que nadie conoce ni usa:
 * el usuario define la suya con el enlace de invitación.
 */
function randomTempPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Tmp!${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')}`;
}

interface NewUserParams {
  name: string;
  email: string;
  roleId: string;
  status: string;
  /** ID original de AppSheet (solo referencia histórica; el login usa el uid). */
  appsheetId?: string | null;
}

/**
 * Alta de usuario SIN enviar correo:
 * 1. Se crea la cuenta en Firebase Auth con una contraseña temporal aleatoria
 *    (vía instancia secundaria, para no cerrar la sesión del administrador).
 * 2. Se guarda el perfil en Firestore (id = uid).
 * La invitación para establecer contraseña se envía después, cuando el
 * administrador presiona el botón de invitación del usuario.
 */
export async function createUserWithProfile(params: NewUserParams): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${Math.random()}`);
  const secondaryAuth = getAuth(secondaryApp);
  secondaryAuth.languageCode = 'es';
  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      params.email,
      randomTempPassword(),
    );
    const uid = credential.user.uid;
    await setDocument(COLLECTIONS.users, uid, {
      name: params.name,
      email: params.email,
      roleId: params.roleId,
      status: params.status,
      appsheetId: params.appsheetId ?? null,
    });
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

/** Envía (o reenvía) la invitación para establecer/restablecer contraseña. */
export async function sendSetPasswordEmail(email: string): Promise<void> {
  const { auth } = await import('../firebase/config');
  await sendPasswordResetEmail(auth, email);
}