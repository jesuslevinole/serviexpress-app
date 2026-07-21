import { useMemo } from 'react';
import { AlertTriangle, Truck, Users, Wrench } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { COLLECTIONS } from '../config/collections';
import { Badge } from '../components/ui/Badge';
import { DataTable, type TableColumn } from '../components/ui/DataTable';
import { Spinner } from '../components/ui/Spinner';
import './DashboardPage.css';

const DAYS_AHEAD = 30;

function withinDays(dateIso: string, days: number): boolean {
  const target = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;
  const now = new Date();
  const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return target <= limit;
}

export function DashboardPage() {
  const trucks = useCollection(COLLECTIONS.trucks);
  const drivers = useCollection(COLLECTIONS.drivers);
  const shop = useCollection(COLLECTIONS.shopOrders);

  const loading = trucks.loading || drivers.loading || shop.loading;

  const stats = useMemo(() => {
    const activeTrucks = trucks.rows.filter((t) => t.status === true).length;
    const activeDrivers = drivers.rows.filter((d) => d.status === true).length;
    const openOrders = shop.rows.filter(
      (o) => o.status === 'ABIERTA' || o.status === 'EN PROCESO',
    ).length;
    const upcoming = trucks.rows.filter(
      (t) => typeof t.nextMant === 'string' && t.nextMant !== '' && withinDays(t.nextMant, DAYS_AHEAD),
    );
    return { activeTrucks, activeDrivers, openOrders, upcoming };
  }, [trucks.rows, drivers.rows, shop.rows]);

  const columns: TableColumn[] = [
    { key: 'unitN', label: 'Unit', render: (r) => String(r.unitN ?? '—') },
    { key: 'lPlate', label: 'Plate', render: (r) => String(r.lPlate ?? '—') },
    { key: 'nextMant', label: 'Next maintenance', render: (r) => String(r.nextMant ?? '—') },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge value={r.status === true ? 'Yes' : 'No'} />,
    },
  ];

  if (loading) return <Spinner />;

  const cards = [
    { icon: Truck, label: 'Active trucks', value: stats.activeTrucks, tone: 'primary' },
    { icon: Users, label: 'Active drivers', value: stats.activeDrivers, tone: 'success' },
    { icon: Wrench, label: 'Open shop orders', value: stats.openOrders, tone: 'warning' },
    {
      icon: AlertTriangle,
      label: `Maintenance in ${DAYS_AHEAD} days`,
      value: stats.upcoming.length,
      tone: 'danger',
    },
  ] as const;

  return (
    <div className="dashboard">
      <div className="dashboard-cards">
        {cards.map((card) => (
          <div key={card.label} className={`dashboard-card tone-${card.tone}`}>
            <card.icon size={22} />
            <div>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className="dashboard-subtitle">Upcoming maintenance ({DAYS_AHEAD} days)</h2>
      <DataTable
        columns={columns}
        rows={stats.upcoming}
        emptyMessage="No upcoming maintenance"
        canEdit={false}
        canDelete={false}
      />
    </div>
  );
}
