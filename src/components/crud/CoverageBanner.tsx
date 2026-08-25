import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useCollection } from '../../hooks/useCollection';
import type { CoverageConfig, EntityData } from '../../types/models';
import './CoverageBanner.css';

interface CoverageBannerProps {
  config: CoverageConfig;
  /** Filas del módulo que se está viendo, ya filtradas por alcance. */
  rows: EntityData[];
  /** true si estas filas SON la lista de referencia (Trucks), false si son las que cubren (Fleet). */
  rowsAreSource: boolean;
}

/** Texto que identifica un registro de la lista de referencia. */
function labelOf(row: EntityData, keys: string[]): string {
  const parts = keys
    .map((key) => row[key])
    .filter((value) => typeof value === 'string' && value !== '');
  return parts.length > 0 ? parts.join(' · ') : row.id;
}

/**
 * Aviso de cobertura: de los N registros de una lista (camiones), cuántos
 * están dados de alta en otra (Fleet) y cuántos no, con la lista de los que
 * faltan. Aparece igual en los dos módulos para que ambos vean lo mismo.
 */
export function CoverageBanner({ config, rows, rowsAreSource }: CoverageBannerProps) {
  const [open, setOpen] = useState(false);

  // Se lee la colección que no viene por props; la otra ya está en pantalla.
  const fetched = useCollection(rowsAreSource ? config.targetCollection : config.sourceCollection);

  const source = rowsAreSource ? rows : fetched.rows;
  const target = rowsAreSource ? fetched.rows : rows;

  const missing = useMemo(() => {
    const covered = new Set(
      target
        .map((row) => row[config.targetKey])
        .filter((value): value is string => typeof value === 'string' && value !== ''),
    );
    return source.filter((row) => !covered.has(row.id));
  }, [source, target, config.targetKey]);

  if (fetched.loading || source.length === 0) return null;

  const registered = source.length - missing.length;

  return (
    <section className={`coverage ${missing.length > 0 ? 'has-missing' : ''}`}>
      <div className="coverage-head">
        {missing.length > 0 ? <AlertTriangle size={16} /> : null}
        <span className="coverage-text">
          Of <strong>{source.length}</strong> {config.sourceLabel},{' '}
          <strong>{registered}</strong> {config.coveredLabel} and{' '}
          <strong>{missing.length}</strong> {config.missingLabel}.
        </span>
        {missing.length > 0 ? (
          <button type="button" className="coverage-toggle" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide list' : 'See which ones'}
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        ) : null}
      </div>

      {open && missing.length > 0 ? (
        <ul className="coverage-list">
          {missing.map((row) => (
            <li key={row.id}>{labelOf(row, config.sourceLabelKeys)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
