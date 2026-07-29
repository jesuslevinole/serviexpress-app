import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { PermissionAction, Role, UserProfile } from '../types/models';

export interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (moduleId: string, action: PermissionAction) => boolean;
  /** True cuando el rol REAL del usuario es admin. */
  isAdmin: boolean;
  /** Perfil que se está simulando con "View as" (null = vista propia). */
  viewAs: UserProfile | null;
  startViewAs: (profile: UserProfile) => Promise<void>;
  stopViewAs: () => void;
  /** Rol con el que se evalúan permisos y visibilidad (el simulado en View as). */
  effectiveRole: Role | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);