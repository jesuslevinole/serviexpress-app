import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  ClipboardCheck,
  ClipboardList,
  FolderCog,
  KeySquare,
  LayoutDashboard,
  Pencil,
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
import { useUiConfig } from '../../hooks/useUiConfig';
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
  const { can, isAdmin } = useAuth();
  const { editMode, moduleTitle, sortModules, saveModuleOverride, saveMenuOrder } = useUiConfig();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const orderedModules = useMemo(() => sortModules(CRUD_MODULES), [sortModules]);
  const visibleModules = orderedModules.filter((m) => can(m.id, 'ver'));
  const editing = editMode && isAdmin;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `sidebar-link ${isActive ? 'is-active' : ''}`;

  const moveModule = (moduleId: string, delta: number) => {
    const ids = orderedModules.map((m) => m.id);
    const index = ids.indexOf(moduleId);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void saveMenuOrder(ids);
  };

  const startRename = (moduleId: string, currentTitle: string) => {
    setRenaming(moduleId);
    setRenameValue(currentTitle);
  };

  const confirmRename = () => {
    if (renaming && renameValue.trim() !== '') {
      void saveModuleOverride(renaming, { title: renameValue.trim() });
    }
    setRenaming(null);
  };

  return (
    <>
      {open ? <div className="sidebar-backdrop" onClick={onClose} /> : null}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src={logoUrl} alt="ServiExpress" width={34} height={34} />
          <div>
            <strong>ServiExpress</strong>
            <span>Fleet control</span>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" onClick={editing ? undefined : onClose}>
          {can('dashboard', 'ver') ? (
            <NavLink to="/" end className={linkClass}>
              <LayoutDashboard size={17} />
              Dashboard
            </NavLink>
          ) : null}

          {visibleModules.map((module) => {
            const Icon = ICONS[module.icon] ?? Truck;
            const title = moduleTitle(module.id, module.title);
            if (editing && renaming === module.id) {
              return (
                <div key={module.id} className="sidebar-link sidebar-edit-row">
                  <Icon size={17} />
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                    autoFocus
                  />
                  <button type="button" className="sidebar-mini-btn" onClick={confirmRename} aria-label="Save name">
                    <Check size={13} />
                  </button>
                </div>
              );
            }
            return (
              <div key={module.id} className={editing ? 'sidebar-edit-wrap' : undefined}>
                <NavLink to={`/${module.id}`} className={linkClass}>
                  <Icon size={17} />
                  <span className="sidebar-link-text">{title}</span>
                  {editing ? (
                    <span className="sidebar-edit-actions" onClick={(e) => e.preventDefault()}>
                      <button
                        type="button"
                        className="sidebar-mini-btn"
                        onClick={() => startRename(module.id, title)}
                        aria-label="Rename"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        className="sidebar-mini-btn"
                        onClick={() => moveModule(module.id, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="sidebar-mini-btn"
                        onClick={() => moveModule(module.id, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </span>
                  ) : null}
                </NavLink>
              </div>
            );
          })}

          {can('catalogs', 'ver') ? (
            <NavLink to="/catalogs" className={linkClass}>
              <FolderCog size={17} />
              Catalogs
            </NavLink>
          ) : null}

          <div className="sidebar-section">Administration</div>

          {can('users', 'ver') ? (
            <NavLink to="/users" className={linkClass}>
              <UserCog size={17} />
              Users
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
