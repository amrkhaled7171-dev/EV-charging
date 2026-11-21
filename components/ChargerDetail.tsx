'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { fetcher, POLL_MS } from '@/lib/fetcher';
import { useChargers, useNow, timeAgo } from '@/lib/hooks';
import type { AlertItem, HistoryPoint } from '@/lib/types';
import AlertList from './AlertList';
import ConnectionBanner from './ConnectionBanner';
import HistoryChart from './HistoryChart';
import StatusBadge from './StatusBadge';

export default function ChargerDetail({ id }: { id: string }) {
  const { chargers, error } = useChargers();
  const now = useNow();
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const history = useSWR<HistoryPoint[]>(
    `/api/chargers/${encodeURIComponent(id)}/readings?limit=100`,
    fetcher,
    { refreshInterval: POLL_MS },
  );
  const alerts = useSWR<AlertItem[]>(`/api/alerts?charger_id=${encodeURIComponent(id)}`, fetcher, {
    refreshInterval: POLL_MS,
  });

  const charger = chargers?.find((c) => c.charger_id === id);
  const lost = Boolean(error);

  async function toggleMaintenance() {
    if (!charger) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/chargers/${encodeURIComponent(id)}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY ?? '',
        },
        body: JSON.stringify({ maintenance: !charger.maintenance_flag }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await Promise.all([mutate('/api/chargers'), alerts.mutate()]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <Link href="/" className="back">← All chargers</Link>
      {lost && <ConnectionBanner />}

      {!charger ? (
        <p className="empty">{chargers ? `Charger ${id} was not found.` : 'Loading…'}</p>
      ) : (
        <div className={lost ? 'stale' : undefined}>
          <header className="header">
            <h1>{charger.name ?? charger.charger_id}</h1>
            <div className="meta">
              <span>{charger.charger_id}</span>
              <StatusBadge status={charger.status} />
              <span>Updated {timeAgo(charger.last_seen, now)}</span>
            </div>
          </header>

          <section className="panel">
            <h2>History (last 100 readings)</h2>
            {history.data ? (
              <HistoryChart points={history.data} />
            ) : (
              <p className="empty">{history.error ? 'Could not load history.' : 'Loading…'}</p>
            )}
          </section>

          <section className="panel">
            <h2>Alerts</h2>
            {alerts.data ? (
              <AlertList alerts={alerts.data} />
            ) : (
              <p className="empty">{alerts.error ? 'Could not load alerts.' : 'Loading…'}</p>
            )}
          </section>

          <section className="panel">
            <h2>Maintenance</h2>
            <p className="empty">
              {charger.maintenance_flag
                ? 'This charger is flagged for maintenance.'
                : 'Flag this charger to take it out of service.'}
            </p>
            <button className="btn primary" onClick={toggleMaintenance} disabled={busy || lost}>
              {charger.maintenance_flag ? 'Clear maintenance flag' : 'Set maintenance flag'}
            </button>
            {actionError && <p role="alert" style={{ color: 'var(--danger)' }}>{actionError}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
