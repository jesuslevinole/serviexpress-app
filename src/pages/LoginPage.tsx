import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui/Spinner';
import './LoginPage.css';

export function LoginPage() {
  const { firebaseUser, loading, login, bypassEnabled, bypassLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner label="Verificando sesión…" />;
  if (firebaseUser) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('Correo o contraseña incorrectos, o el usuario está inactivo');
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-panel login-brand">
        <img src="/logo.svg" alt="ServiExpress" width={110} height={110} />
        <h1>ServiExpress</h1>
        <p>Control de flotilla · mantenimiento, taller, drivers y unidades</p>
      </div>
      <div className="login-panel login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Iniciar sesión</h2>
          <label className="login-label" htmlFor="login-email">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="login-label" htmlFor="login-password">
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          {bypassEnabled ? (
            <button
              type="button"
              className="btn login-bypass"
              onClick={bypassLogin}
              disabled={busy}
            >
              Entrar en modo desarrollo (sin cuenta)
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}