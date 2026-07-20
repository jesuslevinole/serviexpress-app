import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Topbar.css';

interface TopbarProps {
  title: string;
  onMenu: () => void;
}

export function Topbar({ title, onMenu }: TopbarProps) {
  const { profile, role, logout } = useAuth();

  return (
    <header className="topbar">
      <button type="button" className="icon-btn topbar-menu" onClick={onMenu} aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-user">
        <div className="topbar-avatar">{(profile?.name ?? '?').charAt(0).toUpperCase()}</div>
        <div className="topbar-user-info">
          <strong>{profile?.name ?? ''}</strong>
          <span>{role?.name ?? ''}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          title="Cerrar sesión"
          onClick={() => void logout()}
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
