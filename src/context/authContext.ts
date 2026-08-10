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
  /**
   * Igual que `can`, pero cuando el rol todavía no define la acción (roles
   * creados antes de que existiera) hereda la respuesta de `fallback`. Sirve
   * para las acciones nuevas de la barra: sin esto, al publicar la versión
   * todos los roles perderían los botones hasta que alguien editara la matriz.
   */
  canOr: (moduleId: string, action: PermissionAction, fallback: PermissionAction) => boolean;
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