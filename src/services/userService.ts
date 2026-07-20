import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { COLLECTIONS } from '../config/collections';
import { setDocument } from './firestoreService';

/**
 * Crea un usuario en Firebase Auth SIN cerrar la sesión del administrador.
 * Truco estándar: se usa una instancia secundaria de la app para el alta
 * y se destruye al terminar.
 */
export async function createUserWithProfile(params: {
  name: string;
  email: string;
  password: string;
  roleId: string;
  status: string;
}): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      params.email,
      params.password,
    );
    const uid = credential.user.uid;
    await setDocument(COLLECTIONS.users, uid, {
      name: params.name,
      email: params.email,
      roleId: params.roleId,
      status: params.status,
    });
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}
