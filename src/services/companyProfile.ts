import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase/config';

/**
 * Identidad de la empresa (módulo "Company"): nombre, lema y logo. El logo
 * sube a Storage (carpeta company/) y su URL se guarda aquí; el login y el
 * menú lateral lo muestran con el MISMO tamaño de siempre.
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
  onError?: (message: string) => void,
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
    (error) => {
      // Antes se caía a los valores de fábrica EN SILENCIO: parecía que lo
      // guardado "se borraba solo". Ahora el motivo se ve en pantalla.
      console.error('[company] no se pudo leer la identidad', error);
      onError?.(error.message);
    },
  );
}

/** Lectura puntual para comprobar que lo guardado quedó (diagnóstico). */
export async function readCompanyProfileOnce(): Promise<CompanyProfile | null> {
  const snapshot = await getDoc(doc(db, DOC[0], DOC[1]));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    name: typeof data.name === 'string' ? data.name : DEFAULT_COMPANY.name,
    tagline: typeof data.tagline === 'string' ? data.tagline : DEFAULT_COMPANY.tagline,
    logoUrl: typeof data.logoUrl === 'string' && data.logoUrl !== '' ? data.logoUrl : null,
  };
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
