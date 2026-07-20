import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui/Spinner';
import { CRUD_MODULES } from './config/modules';
import { CrudModule } from './components/crud/CrudModule';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogosPage } from './pages/CatalogosPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { RolesPage } from './pages/RolesPage';
import type { ReactNode } from 'react';
import './App.css';

/** Protege una ruta: exige sesión iniciada y permiso de ver el módulo. */
function Protected({ moduleId, children }: { moduleId: string; children: ReactNode }) {
  const { firebaseUser, loading, can } = useAuth();
  if (loading) return <Spinner label="Verificando sesión…" />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!can(moduleId, 'ver')) {
    return (
      <div className="app-no-access">
        <h2>Sin acceso</h2>
        <p>Tu rol no tiene permiso para ver este módulo. Pide acceso a un administrador.</p>
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
