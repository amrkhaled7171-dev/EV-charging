'use client';

import { useChargers, useNow } from '@/lib/hooks';
import ChargerCard from './ChargerCard';
import ConnectionBanner from './ConnectionBanner';
import SummaryBar from './SummaryBar';

export default function Dashboard() {
  const { chargers, error, lastRefresh } = useChargers();
  const now = useNow();
  const lost = Boolean(error);

  return (
    <main className="page">
      <header className="header">
        <h1>EV Charging Monitor</h1>
        <div className="meta">
          <span>
            <span className={`dot${lost ? ' lost' : ''}`} />
            {lost ? 'Connection lost' : 'Connected'}
          </span>
          <span>Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : '-'}</span>
        </div>
      </header>

      {lost && <ConnectionBanner />}

      {!chargers && !lost && <p className="empty">Loading chargers…</p>}
      {!chargers && lost && <p className="empty">No data yet. Start the database and the server, then this page recovers by itself.</p>}

      {chargers && (
        <div className={lost ? 'stale' : undefined}>
          <SummaryBar chargers={chargers} />
          {chargers.length === 0 ? (
            <p className="empty">No chargers registered yet. Add rows to the chargers table.</p>
          ) : (
            <section className="grid" aria-label="Chargers">
              {chargers.map((c) => (
                <ChargerCard key={c.charger_id} charger={c} now={now} stale={lost} />
              ))}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
