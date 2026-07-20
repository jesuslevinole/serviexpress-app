import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CRUD_MODULES } from '../../config/modules';
import './AppLayout.css';

const STATIC_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/catalogs': 'Catálogos',
  '/users': 'Usuarios',
  '/roles': 'Roles',
};

function resolveTitle(pathname: string): string {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];
  const module = CRUD_MODULES.find((m) => pathname === `/${m.id}`);
  return module ? module.title : 'ServiExpress';
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="layout">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="layout-main">
        <Topbar title={resolveTitle(location.pathname)} onMenu={() => setMenuOpen(true)} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
