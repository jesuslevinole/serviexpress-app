import { useEffect, useRef, useState } from 'react';
import { Building2, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BrandLogo } from '../components/ui/BrandLogo';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import {
  readCompanyProfileOnce,
  saveCompanyProfile,
  uploadCompanyLogo,
} from '../services/companyProfile';
import './CompanyPage.css';

/**
 * "Company" (solo admin): nombre, lema y LOGO que se muestran en el login y
 * en el menú lateral. El logo sube a Storage y se muestra TAL CUAL (sin
 * fondos ni marcos) con los tamaños de siempre: 38 px menú, 150 px login.
 */
export function CompanyPage() {
  const { firebaseUser, can } = useAuth();
  const canEdit = can('company', 'editar');
  const company = useCompanyProfile();
  const [name, setName] = useState(company.name);
  const [tagline, setTagline] = useState(company.tagline);
  const [logoUrl, setLogoUrl] = useState<string | null>(company.logoUrl);
  /** Evita que la suscripción pise lo que el admin está escribiendo. */
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // El logo SIEMPRE refleja lo guardado (se aplica al subirlo); los textos
  // no se pisan mientras el admin los está escribiendo.
  useEffect(() => {
    setLogoUrl(company.logoUrl);
  }, [company.logoUrl]);

  useEffect(() => {
    if (dirty) return;
    setName(company.name);
    setTagline(company.tagline);
  }, [company.name, company.tagline, dirty]);

  const handleLogo = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const url = await uploadCompanyLogo(files[0]);
      // Se aplica DE INMEDIATO: subir el archivo y guardarlo son una sola
      // acción, así el logo nunca queda "subido pero sin aplicar".
      await saveCompanyProfile(
        {
          name: name.trim() === '' ? 'ServiExpress' : name.trim(),
          tagline: tagline.trim() === '' ? 'Fleet control' : tagline.trim(),
          logoUrl: url,
        },
        firebaseUser?.uid ?? null,
      );
      setLogoUrl(url);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `The logo could not be uploaded: ${err.message}`
          : 'The logo could not be uploaded',
      );
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  /** Quitar el logo configurado y volver al de fábrica. */
  const handleRemoveLogo = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveCompanyProfile(
        {
          name: name.trim() === '' ? 'ServiExpress' : name.trim(),
          tagline: tagline.trim() === '' ? 'Fleet control' : tagline.trim(),
          logoUrl: null,
        },
        firebaseUser?.uid ?? null,
      );
      setLogoUrl(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? `It could not be removed: ${err.message}` : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveCompanyProfile(
        {
          name: name.trim() === '' ? 'ServiExpress' : name.trim(),
          tagline: tagline.trim() === '' ? 'Fleet control' : tagline.trim(),
          logoUrl,
        },
        firebaseUser?.uid ?? null,
      );
      // Comprobación real: se vuelve a LEER lo guardado. Si el documento no
      // se puede leer, el aviso lo dice en vez de "revertirse solo".
      const stored = await readCompanyProfileOnce();
      if (stored === null) {
        setError(
          'Se guardó, pero al releerlo el documento no aparece. Revisa las reglas de Firestore para settings_company.',
        );
      } else {
        setName(stored.name);
        setTagline(stored.tagline);
        setLogoUrl(stored.logoUrl);
        setDirty(false);
        setSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? `It could not be saved: ${err.message}` : 'Save error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="company">
      <header className="company-head">
        <Building2 size={20} />
        <div>
          <h2>Company</h2>
          <p>Name, tagline and logo shown on the login screen and the side menu.</p>
        </div>
      </header>

      {company.error ? (
        <p className="company-error">
          The saved identity cannot be READ ({company.error}). Firestore rules must allow the
          collection <code>settings_company</code>; meanwhile the app shows the built-in values.
        </p>
      ) : null}
      {error ? <p className="company-error">{error}</p> : null}
      {saved ? <p className="company-saved">Saved — the login and the menu now use it.</p> : null}

      <section className="company-card">
        <h3>Logo</h3>
        <p className="company-hint">
          Shown exactly as uploaded — no background, no frames — at the same sizes as today:
          38 px in the menu, 150 px on the login. A PNG with a transparent background looks best.
        </p>
        <div className="company-logo-row">
          <div className="company-logo-preview">
            <span>Menu (38 px)</span>
            <div className="company-logo-box is-small">
              <BrandLogo size={38} />
            </div>
          </div>
          <div className="company-logo-preview is-login">
            <span>Login (150 px)</span>
            <div className="company-logo-box is-big">
              <BrandLogo size={150} />
            </div>
          </div>
          <div className="company-logo-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={15} />
              {busy ? 'Working…' : 'Upload logo'}
            </button>
            {logoUrl ? (
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy || !canEdit}
                onClick={() => void handleRemoveLogo()}
              >
                Remove logo
              </button>
            ) : null}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="company-file"
            onChange={(e) => void handleLogo(e.target.files)}
          />
        </div>
        <p className="company-pending">
          {logoUrl
            ? 'A custom logo is in use — it applies as soon as you upload it, on the menu and the login.'
            : 'No custom logo yet: the app is using the built-in one. Upload a PNG with a transparent background.'}
        </p>
      </section>

      <section className="company-card">
        <h3>Texts</h3>
        <label className="company-field">
          <span>Company name</span>
          <input
            className="field-input"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        <label className="company-field">
          <span>Tagline (under the name)</span>
          <input
            className="field-input"
            value={tagline}
            maxLength={90}
            onChange={(e) => {
              setTagline(e.target.value);
              setDirty(true);
            }}
          />
        </label>
      </section>

      <div className="company-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !canEdit}
          onClick={() => void handleSave()}
        >
          {busy ? 'Working…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
