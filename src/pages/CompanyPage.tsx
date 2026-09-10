import { useEffect, useRef, useState } from 'react';
import { Building2, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { saveCompanyProfile, uploadCompanyLogo } from '../services/companyProfile';
import './CompanyPage.css';

/**
 * "Company" (solo admin): el nombre de la empresa, el lema y el LOGO que se
 * muestran en el login y en el menú lateral. El logo sube a Storage y se
 * muestra TAL CUAL (sin fondos ni marcos) con el mismo tamaño de siempre:
 * 38 px en el menú, 150 px en el login.
 */
export function CompanyPage() {
  const { firebaseUser, isAdminView } = useAuth();
  const company = useCompanyProfile();
  const [name, setName] = useState(company.name);
  const [tagline, setTagline] = useState(company.tagline);
  const [logoUrl, setLogoUrl] = useState<string | null>(company.logoUrl);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(company.name);
    setTagline(company.tagline);
    setLogoUrl(company.logoUrl);
  }, [company.name, company.tagline, company.logoUrl]);

  if (!isAdminView) {
    return (
      <div className="app-no-access">
        <h2>No access</h2>
        <p>Only administrators can edit the company identity.</p>
      </div>
    );
  }

  const handleLogo = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadCompanyLogo(files[0]);
      setLogoUrl(url);
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
      setSaved(true);
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

      {error ? <p className="company-error">{error}</p> : null}
      {saved ? <p className="company-saved">Saved — the login and the menu now use it.</p> : null}

      <section className="company-card">
        <h3>Logo</h3>
        <p className="company-hint">
          Shown exactly as uploaded — no background, no frames — at the same sizes as today:
          38 px in the menu, 150 px on the login. A PNG with transparent background looks best.
        </p>
        <div className="company-logo-row">
          <div className="company-logo-preview">
            <span>Menu (38 px)</span>
            {logoUrl ? <img src={logoUrl} alt="logo" className="is-small" /> : <em>current</em>}
          </div>
          <div className="company-logo-preview">
            <span>Login (150 px)</span>
            {logoUrl ? <img src={logoUrl} alt="logo" className="is-big" /> : <em>current</em>}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={15} />
            Upload logo
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="company-file"
            onChange={(e) => void handleLogo(e.target.files)}
          />
        </div>
      </section>

      <section className="company-card">
        <h3>Texts</h3>
        <label className="company-field">
          Company name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <label className="company-field">
          Tagline (under the name)
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={90} />
        </label>
      </section>

      <div className="company-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {busy ? 'Working…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
