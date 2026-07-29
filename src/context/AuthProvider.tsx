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

/** Una hora sin actividad cierra la sesión. */
const IDLE_LIMIT_MS = 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'se-last-activity';

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
    scopeEntities: Array.isArray(data.scopeEntities)
      ? data.scopeEntities.filter((v): v is string => typeof v === 'string')
      : [],
    scopeStations: Array.isArray(data.scopeStations)
      ? data.scopeStations.filter((v): v is string => typeof v === 'string')
      : [],
    isOffice: data.isOffice === true,
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
    // La cuenta de inactividad arranca de cero con cada inicio de sesión.
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setFirebaseUser(null);
    setProfile(null);
    setRole(null);
    await signOut(auth);
  }, []);

  /**
   * Cierre de sesión por inactividad: tras una hora sin usar el app se
   * cierra la sesión. La marca de tiempo vive en localStorage para que
   * también aplique si la pestaña estuvo cerrada.
   */
  useEffect(() => {
    if (!firebaseUser) return;

    const touch = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    const isExpired = () => {
      const stored = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? 0);
      return stored > 0 && Date.now() - stored > IDLE_LIMIT_MS;
    };

    // Sin marca previa (sesión nueva o recién restaurada) se inicia la cuenta.
    if (localStorage.getItem(LAST_ACTIVITY_KEY) === null) {
      touch();
    } else if (isExpired()) {
      void logout();
      return;
    }

    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'keydown',
      'wheel',
      'touchstart',
      'focus',
    ];
    events.forEach((event) => window.addEventListener(event, touch, { passive: true }));

    const interval = window.setInterval(() => {
      if (isExpired()) void logout();
    }, 60_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, touch));
      window.clearInterval(interval);
    };
  }, [firebaseUser, logout]);

  /** Con "View as" activo, los permisos efectivos son los del usuario simulado. */
  const can = useCallback(
    (moduleId: string, action: PermissionAction): boolean => {
      const effective = viewAs ? viewRole : role;
      if (!effective) return false;
      return effective.permissions[moduleId]?.[action] === true;
    },
    [role, viewAs, viewRole],
  );

  /**
   * Es administrador si su rol es el de sistema o si se llama "admin"
   * (Administrador, Administrator...). Así funciona con roles creados a mano.
   */
  const isAdmin = useMemo(() => {
    if (!role) return false;
    if (role.id === 'admin') return true;
    const name = role.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    return ['admin', 'administrador', 'administrator', 'administradora'].includes(name);
  }, [role]);
  const effectiveRole = viewAs ? viewRole : role;

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
      isAdmin,
      viewAs,
      startViewAs,
      stopViewAs,
      effectiveRole,
    }),
    [
      firebaseUser,
      profile,
      role,
      loading,
      login,
      logout,
      can,
      isAdmin,
      viewAs,
      startViewAs,
      stopViewAs,
      effectiveRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}