import { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';
import { CrudModule } from '../components/crud/CrudModule';
import { DataTable, type TableColumn } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Pagination } from '../components/ui/Pagination';
import { useCollection } from '../hooks/useCollection';
import { COLLECTIONS } from '../config/collections';
import { uniformEntriesModule } from '../config/modules';
import type { EntityData } from '../types/models';
import './UniformInventoryPage.css';

const PAGE_SIZE = 50;

/** Fila de existencias: un artículo en una talla. */
interface StockRow extends EntityData {
  id: string;
  item: string;
  size: string;
  totalIn: number;
  totalOut: number;
  available: number;
}

/** Movimiento del historial de un artículo. */
interface Movement {
  id: string;
  date: string;
  kind: 'in' | 'out';
  quantity: number;
  reference: string;
}

export function UniformInventoryPage() {
  const [tab, setTab] = useState<'stock' | 'entries'>('stock');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailOf, setDetailOf] = useState<StockRow | null>(null);

  const entries = useCollection(COLLECTIONS.uniformEntries);
  const exits = useCollection(COLLECTIONS.uniforms);
  const items = useCollection(COLLECTIONS.uniformItems);
  const sizes = useCollection(COLLECTIONS.sizes);
  const requirements = useCollection(COLLECTIONS.requirements);
  const drivers = useCollection(COLLECTIONS.drivers);

  const loading = entries.loading || exits.loading || items.loading || sizes.loading;

  const itemName = useMemo(
    () => new Map(items.rows.map((r) => [r.id, String(r.name ?? r.id)])),
    [items.rows],
  );
  const sizeName = useMemo(
    () => new Map(sizes.rows.map((r) => [r.id, String(r.name ?? r.id)])),
    [sizes.rows],
  );
  const driverOfRequirement = useMemo(() => {
    const driverName = new Map(drivers.rows.map((r) => [r.id, String(r.name ?? r.id)]));
    return new Map(
      requirements.rows.map((r) => [
        r.id,
        driverName.get(String(r.idDriver ?? '')) ?? 'Requirement',
      ]),
    );
  }, [requirements.rows, drivers.rows]);

  const quantityOf = (row: EntityData): number =>
    typeof row.quantity === 'number' ? row.quantity : 0;
  const keyOf = (row: EntityData): string =>
    `${String(row.idUniformItem ?? '')}|${String(row.idSize ?? '')}`;

  /** Existencias por artículo y talla: entradas menos salidas. */
  const stock = useMemo(() => {
    const map = new Map<string, StockRow>();
    const ensure = (row: EntityData): StockRow => {
      const key = keyOf(row);
      const current = map.get(key);
      if (current) return current;
      const created: StockRow = {
        id: key,
        item: itemName.get(String(row.idUniformItem ?? '')) ?? '—',
        size: sizeName.get(String(row.idSize ?? '')) ?? '—',
        totalIn: 0,
        totalOut: 0,
        available: 0,
      };
      map.set(key, created);
      return created;
    };
    entries.rows.forEach((row) => {
      const target = ensure(row);
      target.totalIn += quantityOf(row);
    });
    exits.rows.forEach((row) => {
      const target = ensure(row);
      target.totalOut += quantityOf(row);
    });
    map.forEach((row) => {
      row.available = row.totalIn - row.totalOut;
    });
    return [...map.values()].sort((a, b) => a.item.localeCompare(b.item));
  }, [entries.rows, exits.rows, itemName, sizeName]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stock;
    return stock.filter((row) => `${row.item} ${row.size}`.toLowerCase().includes(term));
  }, [stock, search]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /** Historial de entradas y salidas del artículo seleccionado. */
  const movements = useMemo((): Movement[] => {
    if (!detailOf) return [];
    const belongs = (row: EntityData) => keyOf(row) === detailOf.id;
    const ins: Movement[] = entries.rows.filter(belongs).map((row) => ({
      id: `in-${row.id}`,
      date: String(row.date ?? row.createdAt ?? '').slice(0, 10),
      kind: 'in',
      quantity: quantityOf(row),
      reference: String(row.observation ?? '') || 'Entry',
    }));
    const outs: Movement[] = exits.rows.filter(belongs).map((row) => ({
      id: `out-${row.id}`,
      date: String(row.registerDate ?? row.createdAt ?? '').slice(0, 10),
      kind: 'out',
      quantity: quantityOf(row),
      reference: driverOfRequirement.get(String(row.idRequeriments ?? '')) ?? 'Requirement',
    }));
    return [...ins, ...outs].sort((a, b) => b.date.localeCompare(a.date));
  }, [detailOf, entries.rows, exits.rows, driverOfRequirement]);

  const columns: TableColumn[] = [
    { key: 'item', label: 'Uniform', render: (r) => String(r.item ?? '—') },
    { key: 'size', label: 'Size', render: (r) => String(r.size ?? '—') },
    { key: 'totalIn', label: 'Received', render: (r) => String(r.totalIn ?? 0) },
    { key: 'totalOut', label: 'Delivered', render: (r) => String(r.totalOut ?? 0) },
    {
      key: 'available',
      label: 'Available',
      render: (r) => {
        const value = Number(r.available ?? 0);
        return (
          <span className={`uinv-stock ${value <= 0 ? 'is-empty' : value <= 3 ? 'is-low' : ''}`}>
            {value}
          </span>
        );
      },
    },
  ];

  return (
    <div className="uinv">
      <div className="uinv-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stock'}
          className={`catalogs-tab ${tab === 'stock' ? 'is-active' : ''}`}
          onClick={() => setTab('stock')}
        >
          Stock on hand
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'entries'}
          className={`catalogs-tab ${tab === 'entries' ? 'is-active' : ''}`}
          onClick={() => setTab('entries')}
        >
          Entries
        </button>
      </div>

      {tab === 'entries' ? (
        <CrudModule config={uniformEntriesModule} />
      ) : loading ? (
        <Spinner />
      ) : (
        <>
          <div className="crud-toolbar">
            <label className="crud-search">
              <Search size={16} />
              <input
                placeholder="Search uniforms…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          <DataTable
            columns={columns}
            rows={pageRows}
            emptyMessage="No uniform entries captured yet"
            canEdit={false}
            canDelete={false}
            onRowClick={(row) => setDetailOf(row as StockRow)}
          />
          <Pagination
            page={safePage}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
          <p className="uinv-hint">
            Available = received in Entries − delivered through Requirements. Click a row to see
            its movement history.
          </p>
        </>
      )}

      {detailOf ? (
        <Modal
          open
          title={`Movements · ${detailOf.item} ${detailOf.size}`}
          onClose={() => setDetailOf(null)}
          size="md"
        >
          <div className="uinv-summary">
            <div>
              <span>Received</span>
              <strong>{detailOf.totalIn}</strong>
            </div>
            <div>
              <span>Delivered</span>
              <strong>{detailOf.totalOut}</strong>
            </div>
            <div className="is-available">
              <span>Available</span>
              <strong>{detailOf.available}</strong>
            </div>
          </div>
          {movements.length === 0 ? (
            <p className="uinv-hint">No movements yet.</p>
          ) : (
            <ul className="uinv-moves">
              {movements.map((move) => (
                <li key={move.id} className={move.kind === 'in' ? 'is-in' : 'is-out'}>
                  <span className="uinv-move-icon">
                    {move.kind === 'in' ? (
                      <ArrowDownCircle size={17} />
                    ) : (
                      <ArrowUpCircle size={17} />
                    )}
                  </span>
                  <span className="uinv-move-date">{move.date || '—'}</span>
                  <span className="uinv-move-ref">{move.reference}</span>
                  <span className="uinv-move-qty">
                    {move.kind === 'in' ? '+' : '−'}
                    {move.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      ) : null}
    </div>
  );
}