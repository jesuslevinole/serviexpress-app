import { NavLink } from 'react-router-dom';
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  FolderCog,
  KeySquare,
  LayoutDashboard,
  Route,
  ScanLine,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { CRUD_MODULES } from '../../config/modules';
import logoUrl from '../../assets/logo.svg';
import './Sidebar.css';

const ICONS: Record<string, LucideIcon> = {
  Truck,
  Users,
  ScanLine,
  Route,
  Wrench,
  ClipboardCheck,
  KeySquare,
  ClipboardList,
  Building2,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { can } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `sidebar-link ${isActive ? 'is-active' : ''}`;

  return (
    <>
      {open ? <div className="sidebar-backdrop" onClick={onClose} /> : null}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src={logoUrl} alt="ServiExpress" width={34} height={34} />
          <div>
            <strong>ServiExpress</strong>
            <span>Control de flotilla</span>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" onClick={onClose}>
          {can('dashboard', 'ver') ? (
            <NavLink to="/" end className={linkClass}>
              <LayoutDashboard size={17} />
              Dashboard
            </NavLink>
          ) : null}

          {CRUD_MODULES.filter((m) => can(m.id, 'ver')).map((module) => {
            const Icon = ICONS[module.icon] ?? Truck;
            return (
              <NavLink key={module.id} to={`/${module.id}`} className={linkClass}>
                <Icon size={17} />
                {module.title}
              </NavLink>
            );
          })}

          {can('catalogs', 'ver') ? (
            <NavLink to="/catalogs" className={linkClass}>
              <FolderCog size={17} />
              Catálogos
            </NavLink>
          ) : null}

          <div className="sidebar-section">Administración</div>

          {can('users', 'ver') ? (
            <NavLink to="/users" className={linkClass}>
              <UserCog size={17} />
              Usuarios
            </NavLink>
          ) : null}
          {can('roles', 'ver') ? (
            <NavLink to="/roles" className={linkClass}>
              <ShieldCheck size={17} />
              Roles
            </NavLink>
          ) : null}
        </nav>
      </aside>
    </>
  );
}