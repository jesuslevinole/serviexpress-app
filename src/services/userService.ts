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
 * el usuario define la suya con el enlace que recibe por correo.
 */
function randomTempPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Tmp!${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')}`;
}

/**
 * Alta de usuario SIN contraseña del admin:
 * 1. Se crea la cuenta en Firebase Auth con una contraseña temporal aleatoria
 *    (vía instancia secundaria, para no cerrar la sesión del administrador).
 * 2. Se guarda el perfil en Firestore.
 * 3. Firebase le envía un correo al usuario con el enlace para establecer
 *    su propia contraseña.
 */
export async function createUserWithProfile(params: {
  name: string;
  email: string;
  roleId: string;
  status: string;
}): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
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
    });
    await sendPasswordResetEmail(secondaryAuth, params.email);
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

/** Reenvía el correo para establecer/restablecer contraseña. */
export async function sendSetPasswordEmail(email: string): Promise<void> {
  const { auth } = await import('../firebase/config');
  await sendPasswordResetEmail(auth, email);
}