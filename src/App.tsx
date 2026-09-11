import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui/Spinner';
import { CRUD_MODULES } from './config/modules';
import { CrudModule } from './components/crud/CrudModule';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogosPage } from './pages/CatalogosPage';
import { UniformInventoryPage } from './pages/UniformInventoryPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { RolesPage } from './pages/RolesPage';
import { CompanyPage } from './pages/CompanyPage';
import type { ReactNode } from 'react';
import './App.css';

/**
 * Protege una ruta: exige sesión iniciada y, según el caso, permiso de ver
 * el módulo o ser administrador. La SESIÓN se evalúa primero: al cerrar
 * sesión, cualquier pantalla manda al login en vez de mostrar "No access".
 */
function Protected({
  moduleId,
  adminOnly,
  children,
}: {
  moduleId?: string;
  adminOnly?: boolean;
  children: ReactNode;
}) {
  const { firebaseUser, loading, can, isAdminView } = useAuth();
  if (loading) return <Spinner label="Checking session…" />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdminView) {
    return (
      <div className="app-no-access">
        <h2>No access</h2>
        <p>Only administrators can open this section.</p>
      </div>
    );
  }
  if (moduleId && !can(moduleId, 'ver')) {
    return (
      <div className="app-no-access">
        <h2>No access</h2>
        <p>Your role has no permission to view this module. Ask an administrator for access.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <Protected moduleId="dashboard">
              <DashboardPage />
            </Protected>
          }
        />
        {CRUD_MODULES.map((module) => (
          <Route
            key={module.id}
            path={`/${module.id}`}
            element={
              <Protected moduleId={module.id}>
                <CrudModule config={module} />
              </Protected>
            }
          />
        ))}
        <Route
          path="/uniform-inventory"
          element={
            <Protected moduleId="uniformInventory">
              <UniformInventoryPage />
            </Protected>
          }
        />
        <Route
          path="/catalogs"
          element={
            <Protected moduleId="catalogs">
              <CatalogosPage />
            </Protected>
          }
        />
        <Route
          path="/users"
          element={
            <Protected moduleId="users">
              <UsuariosPage />
            </Protected>
          }
        />
        <Route
          path="/roles"
          element={
            <Protected moduleId="roles">
              <RolesPage />
            </Protected>
          }
        />
        <Route
          path="/company"
          element={
            <Protected moduleId="company">
              <CompanyPage />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}