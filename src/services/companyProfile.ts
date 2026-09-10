import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase/config';

/**
 * Identidad de la empresa (configurable por el admin en "Company"): nombre,
 * lema y logo. El logo sube a Storage (carpeta company/) y su URL se guarda
 * aquí; el login y el menú lateral lo muestran con el MISMO tamaño de
 * siempre — solo cambia la imagen y el texto.
 */
export interface CompanyProfile {
  name: string;
  tagline: string;
  logoUrl: string | null;
}

export const DEFAULT_COMPANY: CompanyProfile = {
  name: 'ServiExpress',
  tagline: 'Fleet control',
  logoUrl: null,
};

const DOC = ['settings_company', 'profile'] as const;

export function subscribeCompanyProfile(
  onData: (profile: CompanyProfile) => void,
): () => void {
  return onSnapshot(
    doc(db, DOC[0], DOC[1]),
    (snapshot) => {
      const data = snapshot.data();
      onData({
        name:
          typeof data?.name === 'string' && data.name.trim() !== ''
            ? data.name
            : DEFAULT_COMPANY.name,
        tagline:
          typeof data?.tagline === 'string' && data.tagline.trim() !== ''
            ? data.tagline
            : DEFAULT_COMPANY.tagline,
        logoUrl: typeof data?.logoUrl === 'string' && data.logoUrl !== '' ? data.logoUrl : null,
      });
    },
    () => onData({ ...DEFAULT_COMPANY }),
  );
}

export async function saveCompanyProfile(
  profile: CompanyProfile,
  updatedBy: string | null,
): Promise<void> {
  await setDoc(doc(db, DOC[0], DOC[1]), {
    ...profile,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}

/** Sube el logo a Storage y devuelve su URL pública. */
export async function uploadCompanyLogo(file: File): Promise<string> {
  const clean = file.name.replace(/[^\w.-]+/g, '_').slice(0, 60);
  const fileRef = ref(storage, `company/${Date.now()}-${clean}`);
  await uploadBytes(fileRef, file, { contentType: file.type || undefined });
  return getDownloadURL(fileRef);
}
