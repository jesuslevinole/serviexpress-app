import { useMemo, useState, type CSSProperties } from 'react';
import {
  ClipboardCheck,
  ClipboardList,
  Download,
  KeySquare,
  Route,
  ScanLine,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { useScopeFilter } from '../hooks/useScope';
import { useUiConfig } from '../hooks/useUiConfig';
import { COLLECTIONS } from '../config/collections';
import {
  CRUD_MODULES,
  assetsModule,
  bcReportsModule,
  driversModule,
  fleetModule,
  maintenanceModule,
  rentalsModule,
  requirementsModule,
  shopModule,
  trucksModule,
} from '../config/modules';
import { exportReportsWorkbook } from '../services/reportsExport';
import { Spinner } from '../components/ui/Spinner';
import type { EntityData, ModuleConfig } from '../types/models';
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
  const { can } = useAuth();
  const { moduleTitle } = useUiConfig();
  const scopeFilter = useScopeFilter();

  const trucks = useCollection(COLLECTIONS.trucks);
  const drivers = useCollection(COLLECTIONS.drivers);
  const assets = useCollection(COLLECTIONS.assets);
  const fleet = useCollection(COLLECTIONS.fleet);
  const shop = useCollection(COLLECTIONS.shopOrders);
  const maintenance = useCollection(COLLECTIONS.maintenance);
  const bcReports = useCollection(COLLECTIONS.bcReports);
  const rentals = useCollection(COLLECTIONS.rentals);
  const requirements = useCollection(COLLECTIONS.requirements);
  const requestTypes = useCollection(COLLECTIONS.requestTypes);

  const loading =
    trucks.loading || drivers.loading || maintenance.loading || requirements.loading;

  /** Aplica el alcance del rol a cada colección antes de contar. */
  const scoped = (rows: EntityData[], config: ModuleConfig): EntityData[] =>
    rows.filter((row) => scopeFilter(config, row));

  const trucksRows = scoped(trucks.rows, trucksModule);
  const driversRows = scoped(drivers.rows, driversModule);
  const assetsRows = scoped(assets.rows, assetsModule);
  const fleetRows = scoped(fleet.rows, fleetModule);
  const shopRows = scoped(shop.rows, shopModule);
  const maintenanceRows = scoped(maintenance.rows, maintenanceModule);
  const bcRows = scoped(bcReports.rows, bcReportsModule);
  const rentalsRows = scoped(rentals.rows, rentalsModule);
  const requirementsRows = scoped(requirements.rows, requirementsModule);

  const corrective = maintenanceRows.filter((r) => r.type === 'Corrective').length;
  const preventive = maintenanceRows.filter((r) => r.type === 'Preventive').length;
  const maintenanceTotal = corrective + preventive;
  const correctivePct = maintenanceTotal === 0 ? 0 : Math.round((corrective / maintenanceTotal) * 100);
  const preventivePct = maintenanceTotal === 0 ? 0 : 100 - correctivePct;
  const correctiveArc = maintenanceTotal === 0 ? 0 : DONUT_C * (corrective / maintenanceTotal);
  const preventiveArc = maintenanceTotal === 0 ? 0 : DONUT_C * (preventive / maintenanceTotal);

  /** Requerimientos agrupados por tipo de solicitud, de mayor a menor. */
  const requirementsByType = useMemo(() => {
    const names = new Map(requestTypes.rows.map((r) => [r.id, String(r.name ?? r.id)]));
    const counts = new Map<string, number>();
    requirementsRows.forEach((row) => {
      const id = typeof row.idRequest === 'string' ? row.idRequest : '';
      const label = names.get(id) ?? 'Not specified';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [requirementsRows, requestTypes.rows]);

  /** Base de la barra más larga del desglose. */
  const maxRequirement = Math.max(1, ...requirementsByType.map(([, count]) => count));

  const allCards: StatCard[] = [
    { id: 'bcReports', label: 'BC Reports', value: bcRows.length, icon: ClipboardCheck, tone: 'blue' },
    { id: 'trucks', label: 'Trucks', value: trucksRows.length, icon: Truck, tone: 'blue' },
    { id: 'drivers', label: 'Drivers', value: driversRows.length, icon: Users, tone: 'teal' },
    { id: 'assets', label: 'Assets', value: assetsRows.length, icon: ScanLine, tone: 'violet' },
    { id: 'fleet', label: 'Fleet', value: fleetRows.length, icon: Route, tone: 'green' },
    { id: 'shop', label: 'Shop orders', value: shopRows.length, icon: Wrench, tone: 'amber' },
    { id: 'rentals', label: 'Rentals', value: rentalsRows.length, icon: KeySquare, tone: 'violet' },
    {
      id: 'requirements',
      label: 'Requirements',
      value: requirementsRows.length,
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
        <span className="dash-head-date">Updated {generatedAt}</span>
      </header>

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
              <span>{requirementsRows.length.toLocaleString('en-US')} total</span>
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

      <section className="dash-panel dash-reports">
          <header className="dash-panel-head">
            <h2>Reports</h2>
            <span>One Excel file, one sheet per module</span>
          </header>
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
          <div className="dash-report-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleGenerate()}
              disabled={busy}
            >
              <Download size={16} />
              {busy ? 'Generating…' : 'Generate Excel'}
            </button>
            <span className="dash-report-hint">
              Empty dates export everything. The range uses each module&apos;s own date.
            </span>
          </div>
          {notice ? <p className="dash-report-notice">{notice}</p> : null}
        </section>
    </div>
  );
}