import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { sendSetPasswordEmail } from '../services/userService';
import { Spinner } from '../components/ui/Spinner';
import logoUrl from '../assets/logo.svg';
import './LoginPage.css';

export function LoginPage() {
  const { firebaseUser, loading, login, bypassEnabled, bypassLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner label="Verificando sesión…" />;
  if (firebaseUser) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
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

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Escribe tu correo arriba y vuelve a dar clic');
      return;
    }
    try {
      await sendSetPasswordEmail(email.trim());
      setInfo('Te enviamos un correo con el enlace para establecer tu contraseña');
    } catch {
      setError('No se pudo enviar el correo. Revisa la dirección e intenta de nuevo');
    }
  };

  return (
    <div className="login">
      <div className="login-panel login-brand">
        <img src={logoUrl} alt="ServiExpress" width={110} height={110} />
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
          <button
            type="button"
            className="login-forgot"
            onClick={() => void handleForgotPassword()}
            disabled={busy}
          >
            ¿Olvidaste tu contraseña?
          </button>
          {error ? <p className="login-error">{error}</p> : null}
          {info ? <p className="login-info">{info}</p> : null}
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