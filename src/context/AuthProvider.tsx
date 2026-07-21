import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { AuthContext } from './authContext';
import { COLLECTIONS } from '../config/collections';
import { PERMISSION_MODULES } from '../config/modules';
import type {
  ModulePermissions,
  PermissionAction,
  Role,
  UserProfile,
} from '../types/models';

const FULL_PERMISSIONS: Record<string, ModulePermissions> = Object.fromEntries(
  PERMISSION_MODULES.map((m) => [
    m.id,
    { ver: true, crear: true, editar: true, eliminar: true },
  ]),
);

/**
 * ⚠️ BYPASS TEMPORAL DE DESARROLLO.
 * Con VITE_AUTH_BYPASS=true en el .env se entra sin login, con un usuario
 * ficticio y permisos de admin. QUITAR antes de pasar a producción:
 * basta con borrar la variable del .env (o ponerla en false).
 */
const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

const BYPASS_USER = { uid: 'dev-bypass' } as unknown as User;

const BYPASS_PROFILE: UserProfile = {
  id: 'dev-bypass',
  name: 'Dev (bypass)',
  email: 'dev@local',
  roleId: 'admin',
  status: 'ACTIVO',
};

const BYPASS_ROLE: Role = {
  id: 'admin',
  name: 'Administrador',
  permissions: FULL_PERMISSIONS,
};

async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: uid,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    roleId: typeof data.roleId === 'string' ? data.roleId : '',
    status: typeof data.status === 'string' ? data.status : 'ACTIVO',
  };
}

async function loadRole(roleId: string): Promise<Role | null> {
  if (!roleId) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.roles, roleId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const permissions =
    typeof data.permissions === 'object' && data.permissions !== null
      ? (data.permissions as Record<string, ModulePermissions>)
      : {};
  return {
    id: snapshot.id,
    name: typeof data.name === 'string' ? data.name : snapshot.id,
    permissions,
  };
}

/**
 * Autoarranque: si el perfil apunta al rol "admin" y ese rol todavía no
 * existe en Firestore, se crea con todos los permisos. Así el primer
 * usuario del sistema queda operativo sin pasos manuales extra.
 */
async function ensureAdminRole(roleId: string): Promise<Role | null> {
  if (roleId !== 'admin') return null;
  const ref = doc(db, COLLECTIONS.roles, 'admin');
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return loadRole('admin');
  await setDoc(ref, {
    name: 'Administrador',
    permissions: FULL_PERMISSIONS,
    createdAt: new Date().toISOString(),
  });
  return { id: 'admin', name: 'Administrador', permissions: FULL_PERMISSIONS };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAs] = useState<UserProfile | null>(null);
  const [viewRole, setViewRole] = useState<Role | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const resolve = async () => {
        if (!user) {
          setFirebaseUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          return;
        }
        const loadedProfile = await loadProfile(user.uid);
        if (!loadedProfile || loadedProfile.status !== 'ACTIVO') {
          await signOut(auth);
          setFirebaseUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          return;
        }
        let loadedRole = await loadRole(loadedProfile.roleId);
        if (!loadedRole) {
          loadedRole = await ensureAdminRole(loadedProfile.roleId);
        }
        setFirebaseUser(user);
        setProfile(loadedProfile);
        setRole(loadedRole);
        setLoading(false);
      };
      void resolve();
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    setFirebaseUser(null);
    setProfile(null);
    setRole(null);
    await signOut(auth);
  }, []);

  /** TEMPORAL: entra con usuario ficticio y permisos completos. */
  const bypassLogin = useCallback(() => {
    if (!AUTH_BYPASS) return;
    setFirebaseUser(BYPASS_USER);
    setProfile(BYPASS_PROFILE);
    setRole(BYPASS_ROLE);
    setLoading(false);
  }, []);

  /** Con "View as" activo, los permisos efectivos son los del usuario simulado. */
  const can = useCallback(
    (moduleId: string, action: PermissionAction): boolean => {
      const effective = viewAs ? viewRole : role;
      if (!effective) return false;
      return effective.permissions[moduleId]?.[action] === true;
    },
    [role, viewAs, viewRole],
  );

  const isAdmin = role?.id === 'admin';

  const startViewAs = useCallback(async (profile: UserProfile) => {
    const loadedRole = await loadRole(profile.roleId);
    setViewRole(loadedRole);
    setViewAs(profile);
  }, []);

  const stopViewAs = useCallback(() => {
    setViewAs(null);
    setViewRole(null);
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      role,
      loading,
      login,
      logout,
      can,
      bypassEnabled: AUTH_BYPASS,
      bypassLogin,
      isAdmin,
      viewAs,
      startViewAs,
      stopViewAs,
    }),
    [
      firebaseUser,
      profile,
      role,
      loading,
      login,
      logout,
      can,
      bypassLogin,
      isAdmin,
      viewAs,
      startViewAs,
      stopViewAs,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
