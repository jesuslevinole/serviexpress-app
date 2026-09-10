import { useEffect, useState } from 'react';
import {
  DEFAULT_COMPANY,
  subscribeCompanyProfile,
  type CompanyProfile,
} from '../services/companyProfile';

/**
 * Nombre, lema y logo de la empresa, vivos en toda la app.
 * UNA sola suscripción compartida (1 documento chico): el primer componente
 * la abre y TODOS los que lleguen después reciben el último valor conocido
 * de inmediato — así el menú lateral se actualiza en el mismo instante en
 * que se guarda desde el módulo Company.
 */
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
