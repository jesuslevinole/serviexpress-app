import { useEffect, useState } from 'react';
import {
  DEFAULT_COMPANY,
  subscribeCompanyProfile,
  type CompanyProfile,
} from '../services/companyProfile';

/* Una sola suscripción compartida (1 documento chico) para toda la app. */
let shared: CompanyProfile = { ...DEFAULT_COMPANY };
const listeners = new Set<(profile: CompanyProfile) => void>();
let started = false;

function ensure() {
  if (started) return;
  started = true;
  subscribeCompanyProfile((profile) => {
    shared = profile;
    listeners.forEach((listener) => listener(profile));
  });
}

/** Nombre, lema y logo de la empresa, vivos en toda la app. */
export function useCompanyProfile(): CompanyProfile {
  const [profile, setProfile] = useState<CompanyProfile>(shared);
  useEffect(() => {
    ensure();
    const listener = (value: CompanyProfile) => setProfile(value);
    listeners.add(listener);
    setProfile(shared);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return profile;
}
