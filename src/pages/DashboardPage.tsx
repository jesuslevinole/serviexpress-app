import { useEffect, useState, type CSSProperties } from 'react';
import {
  ClipboardCheck,
  ClipboardList,
  Download,
  Filter,
  X,
  KeySquare,
  Route,
  ScanLine,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { useUiConfig } from '../hooks/useUiConfig';
import { COLLECTIONS } from '../config/collections';
import { CRUD_MODULES } from '../config/modules';
import { countDocuments, type CollectionFilter } from '../services/firestoreService';
import { exportReportsWorkbook } from '../services/reportsExport';
import { Spinner } from '../components/ui/Spinner';
import './DashboardPage.css';

/** Geometría de la dona de mantenimiento. */
const DONUT_R = 56;
const DONUT_C = 2 * Math.PI * DONUT_R;

/** Tarjeta de conteo: el número manda, la etiqueta acompaña. */
interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: typeof Truck;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal';
}

export function DashboardPage() {
  const { can, profile, viewAs, isAdminView, effectiveRole } = useAuth();
  const { moduleTitle } = useUiConfig();

  /**
   * Los KPIs se calculan con conteos agregados (getCountFromServer): cada
   * número cuesta UNA lectura en vez de traer la colección completa. El
   * desglose por tipo de requerimiento usa el catálogo, que es pequeño.
   */
  const requestTypes = useCollection(COLLECTIONS.requestTypes);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [countError, setCountError] = useState<string | null>(null);

  /** Con alcance restringido no se pueden usar agregados: se avisa y no se cuenta. */
  const effectiveUser = viewAs ?? profile;
  const restricted =
    !isAdminView &&
    effectiveUser?.isOffice !== true &&
    Object.values(effectiveRole?.permissions ?? {}).some(
      (permission) => permission.alcance && permission.alcance !== 'all',
    );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setCountError(null);
      try {
        const targets: [string, string, CollectionFilter?][] = [
          ['bcReports', COLLECTIONS.bcReports],
          ['trucks', COLLECTIONS.trucks],
          ['drivers', COLLECTIONS.drivers],
          ['assets', COLLECTIONS.assets],
          ['fleet', COLLECTIONS.fleet],
          ['shop', COLLECTIONS.shopOrders],
          ['rentals', COLLECTIONS.rentals],
          ['requirements', COLLECTIONS.requirements],
          ['corrective', COLLECTIONS.maintenance, { field: 'type', value: 'Corrective' }],
          ['preventive', COLLECTIONS.maintenance, { field: 'type', value: 'Preventive' }],
        ];
        const visible = targets.filter(
          ([id]) =>
            can(id, 'ver') || id === 'corrective' || id === 'preventive'
              ? can(id === 'corrective' || id === 'preventive' ? 'maintenance' : id, 'ver')
              : false,
        );
        const results = await Promise.all(
          visible.map(async ([id, collectionName, filter]) => {
            const value = await countDocuments(collectionName, filter);
            return [id, value] as const;
          }),
        );
        if (cancelled) return;
        setCounts(Object.fromEntries(results));
      } catch (error) {
        if (!cancelled) {
          setCountError(error instanceof Error ? error.message : 'Counters unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [can]);

  const corrective = counts.corrective ?? 0;
  const preventive = counts.preventive ?? 0;
  const maintenanceTotal = corrective + preventive;
  const correctivePct = maintenanceTotal === 0 ? 0 : Math.round((corrective / maintenanceTotal) * 100);
  const preventivePct = maintenanceTotal === 0 ? 0 : 100 - correctivePct;
  const correctiveArc = maintenanceTotal === 0 ? 0 : DONUT_C * (corrective / maintenanceTotal);
  const preventiveArc = maintenanceTotal === 0 ? 0 : DONUT_C * (preventive / maintenanceTotal);

  /** Requerimientos por tipo: un conteo agregado por cada tipo del catálogo. */
  const [byType, setByType] = useState<[string, number][]>([]);

  useEffect(() => {
    if (!can('requirements', 'ver') || requestTypes.rows.length === 0) return;
    let cancelled = false;

    const load = async () => {
      const results = await Promise.all(
        requestTypes.rows.map(async (type) => {
          const value = await countDocuments(COLLECTIONS.requirements, {
            field: 'idRequest',
            value: type.id,
          });
          return [String(type.name ?? type.id), value] as [string, number];
        }),
      );
      if (cancelled) return;
      setByType(results.filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [can, requestTypes.rows]);

  const requirementsByType = byType;
  const maxRequirement = Math.max(1, ...requirementsByType.map(([, count]) => count));

  const allCards: StatCard[] = [
    { id: 'bcReports', label: 'BC Reports', value: counts.bcReports ?? 0, icon: ClipboardCheck, tone: 'blue' },
    { id: 'trucks', label: 'Trucks', value: counts.trucks ?? 0, icon: Truck, tone: 'blue' },
    { id: 'drivers', label: 'Drivers', value: counts.drivers ?? 0, icon: Users, tone: 'teal' },
    { id: 'assets', label: 'Assets', value: counts.assets ?? 0, icon: ScanLine, tone: 'violet' },
    { id: 'fleet', label: 'Fleet', value: counts.fleet ?? 0, icon: Route, tone: 'green' },
    { id: 'shop', label: 'Shop orders', value: counts.shop ?? 0, icon: Wrench, tone: 'amber' },
    { id: 'rentals', label: 'Rentals', value: counts.rentals ?? 0, icon: KeySquare, tone: 'violet' },
    {
      id: 'requirements',
      label: 'Requirements',
      value: counts.requirements ?? 0,
      icon: ClipboardList,
      tone: 'teal',
    },
  ];
  const cards = allCards.filter((card) => can(card.id, 'ver'));

  // ---- Paquete de reportes por rango de fechas ----
  const exportableModules = CRUD_MODULES.filter((m) => can(m.id, 'ver'));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<string[]>(exportableModules.map((m) => m.id));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Cajón lateral con los filtros del reporte. */
  const [reportsOpen, setReportsOpen] = useState(false);

  const toggleModule = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleGenerate = async () => {
    const chosen = exportableModules.filter((m) => selected.includes(m.id));
    if (chosen.length === 0) {
      setNotice('Pick at least one module.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await exportReportsWorkbook(chosen, from, to);
      setNotice(`Done: ${result.rows} records across ${result.sheets} sheets.`);
    } catch {
      setNotice('The report could not be generated. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading dashboard…" />;

  const generatedAt = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <span className="dash-head-eyebrow">Fleet overview</span>
          <h1>ServiExpress control panel</h1>
        </div>
        <div className="dash-head-actions">
          <span className="dash-head-date">Updated {generatedAt}</span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setReportsOpen(true)}
          >
            <Filter size={16} />
            Reports
            {selected.length > 0 ? (
              <span className="dash-head-count">{selected.length}</span>
            ) : null}
          </button>
        </div>
      </header>

      {restricted || countError ? (
        <p className="dash-note">
          {countError
            ? `Counters unavailable: ${countError}`
            : 'These counters show the totals of the whole fleet; each module still shows only the records your role allows.'}
        </p>
      ) : null}

      <section className="dash-cards">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.id} className={`dash-card tone-${card.tone}`}>
              <span className="dash-card-icon">
                <Icon size={16} />
              </span>
              <span className="dash-card-label">{moduleTitle(card.id, card.label)}</span>
              <strong>{card.value.toLocaleString('en-US')}</strong>
            </article>
          );
        })}
      </section>

      <div className="dash-grid">
        {can('maintenance', 'ver') ? (
          <section className="dash-panel">
            <header className="dash-panel-head">
              <h2>Maintenance</h2>
              <span>{maintenanceTotal.toLocaleString('en-US')} total</span>
            </header>
            <div className="dash-donut-wrap">
              <div className="dash-donut-chart">
                <svg viewBox="0 0 140 140" role="img" aria-label="Maintenance split">
                  <g transform="rotate(-90 70 70)">
                    <circle className="dash-arc-track" cx="70" cy="70" r={DONUT_R} />
                    <circle
                      className="dash-arc is-corrective"
                      cx="70"
                      cy="70"
                      r={DONUT_R}
                      strokeDasharray={`${correctiveArc} ${DONUT_C - correctiveArc}`}
                    />
                    <circle
                      className="dash-arc is-preventive"
                      cx="70"
                      cy="70"
                      r={DONUT_R}
                      strokeDasharray={`${preventiveArc} ${DONUT_C - preventiveArc}`}
                      strokeDashoffset={-correctiveArc}
                    />
                  </g>
                </svg>
                <div className="dash-donut-center">
                  <strong>{maintenanceTotal.toLocaleString('en-US')}</strong>
                  <span>records</span>
                </div>
              </div>
              <ul className="dash-legend">
                <li>
                  <i className="dash-legend-dot is-corrective" />
                  <span className="dash-legend-name">Corrective</span>
                  <span className="dash-legend-value">
                    {corrective.toLocaleString('en-US')}
                    <small>{correctivePct}%</small>
                  </span>
                </li>
                <li>
                  <i className="dash-legend-dot is-preventive" />
                  <span className="dash-legend-name">Preventive</span>
                  <span className="dash-legend-value">
                    {preventive.toLocaleString('en-US')}
                    <small>{preventivePct}%</small>
                  </span>
                </li>
              </ul>
            </div>
          </section>
        ) : null}

        {can('requirements', 'ver') ? (
          <section className="dash-panel">
            <header className="dash-panel-head">
              <h2>Requirements by type</h2>
              <span>{(counts.requirements ?? 0).toLocaleString('en-US')} total</span>
            </header>
            {requirementsByType.length === 0 ? (
              <p className="dash-empty">No requirements captured yet.</p>
            ) : (
              <ul className="dash-breakdown">
                {requirementsByType.map(([label, count]) => (
                  <li key={label}>
                    <div className="dash-bar-head">
                      <span className="dash-bar-label">{label}</span>
                      <span className="dash-bar-value">{count}</span>
                    </div>
                    <div className="dash-bar-track">
                      <span
                        className="dash-bar-fill"
                        style={{ '--pct': `${Math.round((count / maxRequirement) * 100)}%` } as CSSProperties}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

      </div>

      {reportsOpen ? (
        <button
          type="button"
          className="dash-drawer-backdrop"
          aria-label="Close reports"
          onClick={() => setReportsOpen(false)}
        />
      ) : null}

      <aside
        className={`dash-drawer ${reportsOpen ? 'is-open' : ''}`}
        aria-hidden={!reportsOpen}
      >
        <header className="dash-drawer-head">
          <strong>Reports</strong>
          <button
            type="button"
            className="dash-drawer-close"
            aria-label="Close"
            onClick={() => setReportsOpen(false)}
          >
            <X size={18} />
          </button>
        </header>
        <div className="dash-drawer-body">
          <p className="dash-drawer-hint">One Excel file, one sheet per module.</p>

          <div className="dash-report-dates">
            <label>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <p className="dash-report-hint">
            Empty dates export everything. The range uses each module&apos;s own date.
          </p>

          <div className="dash-drawer-section">
            <span className="dash-drawer-label">Modules</span>
            <button
              type="button"
              className="dash-drawer-toggle"
              onClick={() =>
                setSelected(
                  selected.length === exportableModules.length
                    ? []
                    : exportableModules.map((m) => m.id),
                )
              }
            >
              {selected.length === exportableModules.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="dash-report-modules">
            {exportableModules.map((module) => (
              <label key={module.id} className="dash-report-chip">
                <input
                  type="checkbox"
                  checked={selected.includes(module.id)}
                  onChange={() => toggleModule(module.id)}
                />
                {moduleTitle(module.id, module.title)}
              </label>
            ))}
          </div>

          {notice ? <p className="dash-report-notice">{notice}</p> : null}
        </div>
        <footer className="dash-drawer-foot">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleGenerate()}
            disabled={busy}
          >
            <Download size={16} />
            {busy ? 'Generating…' : 'Generate Excel'}
          </button>
        </footer>
      </aside>
    </div>
  );
}