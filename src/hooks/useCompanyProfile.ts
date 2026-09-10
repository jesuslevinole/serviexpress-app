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
let sharedError: string | null = null;
const listeners = new Set<() => void>();
let started = false;

function ensure() {
  if (started) return;
  started = true;
  subscribeCompanyProfile(
    (profile) => {
      shared = profile;
      sharedError = null;
      listeners.forEach((listener) => listener());
    },
    (message) => {
      // La lectura falló: se conserva lo último conocido y se avisa.
      sharedError = message;
      listeners.forEach((listener) => listener());
    },
  );
}

export function useCompanyProfile(): CompanyProfile & { error: string | null } {
  const [, force] = useState(0);
  useEffect(() => {
    ensure();
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { ...shared, error: sharedError };
}
