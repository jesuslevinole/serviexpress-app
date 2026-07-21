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

  if (loading) return <Spinner label="Checking session…" />;
  if (firebaseUser) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('Wrong email or password, or the user is inactive');
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Type your email above and click again');
      return;
    }
    try {
      await sendSetPasswordEmail(email.trim());
      setInfo('We sent you an email with the link to set your password');
    } catch {
      setError('Could not send the email. Check the address and try again');
    }
  };

  return (
    <div className="login">
      <div className="login-panel login-brand">
        <img src={logoUrl} alt="ServiExpress" width={110} height={110} />
        <h1>ServiExpress</h1>
        <p>Fleet control · maintenance, shop, drivers and units</p>
      </div>
      <div className="login-panel login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <label className="login-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="login-label" htmlFor="login-password">
            Password
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
            Forgot your password?
          </button>
          {error ? <p className="login-error">{error}</p> : null}
          {info ? <p className="login-info">{info}</p> : null}
          <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {bypassEnabled ? (
            <button
              type="button"
              className="btn login-bypass"
              onClick={bypassLogin}
              disabled={busy}
            >
              Enter in dev mode (no account)
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
