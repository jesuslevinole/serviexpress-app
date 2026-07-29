import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { checkEmailRegistered, sendSetPasswordEmail } from '../services/userService';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { BrandLogo } from '../components/ui/BrandLogo';
import './LoginPage.css';

export function LoginPage() {
  const { firebaseUser, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverBusy, setRecoverBusy] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoverDone, setRecoverDone] = useState<string | null>(null);

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

  /** Envía el enlace solo si el correo pertenece a un usuario del app. */
  const handleRecover = async () => {
    const target = recoverEmail.trim();
    if (target === '') {
      setRecoverError('Type the email where you want to receive the link');
      return;
    }
    setRecoverBusy(true);
    setRecoverError(null);
    setRecoverDone(null);
    const status = await checkEmailRegistered(target);
    if (status === 'not-found') {
      setRecoverError('This email is not registered in the app. Ask an administrator.');
      setRecoverBusy(false);
      return;
    }
    if (status === 'inactive') {
      setRecoverError('This user is inactive. Ask an administrator to reactivate it.');
      setRecoverBusy(false);
      return;
    }
    try {
      await sendSetPasswordEmail(target);
      setRecoverDone(`We sent a link to ${target} to set a new password.`);
    } catch {
      setRecoverError('The email could not be sent. Check the address and try again.');
    } finally {
      setRecoverBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-panel login-brand">
        <BrandLogo size={110} />
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
            onClick={() => {
              setRecoverEmail(email.trim());
              setRecoverError(null);
              setRecoverDone(null);
              setRecoverOpen(true);
            }}
            disabled={busy}
          >
            Forgot your password?
          </button>
          {error ? <p className="login-error">{error}</p> : null}
          {info ? <p className="login-info">{info}</p> : null}
          <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      {recoverOpen ? (
        <Modal
          open
          title="Recover your password"
          onClose={() => setRecoverOpen(false)}
          size="sm"
          footer={
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRecoverOpen(false)}
                disabled={recoverBusy}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleRecover()}
                disabled={recoverBusy}
              >
                {recoverBusy ? 'Checking…' : 'Send link'}
              </button>
            </>
          }
        >
          <div className="login-recover">
            <p>
              Type the email of your account. We check that it belongs to a user of the app before
              sending the link to set a new password.
            </p>
            <label htmlFor="recover-email">Email</label>
            <input
              id="recover-email"
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={recoverEmail}
              onChange={(e) => {
                setRecoverEmail(e.target.value);
                setRecoverError(null);
              }}
            />
            {recoverError ? <p className="login-error">{recoverError}</p> : null}
            {recoverDone ? <p className="login-info">{recoverDone}</p> : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}