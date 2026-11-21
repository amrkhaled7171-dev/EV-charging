'use client';

import Link from 'next/link';
import type { ChargerSummary } from '@/lib/types';
import { timeAgo } from '@/lib/hooks';
import StatusBadge from './StatusBadge';

export default function ChargerCard({
  charger,
  now,
  stale,
}: {
  charger: ChargerSummary;
  now: number;
  stale: boolean;
}) {
  const { latest } = charger;
  return (
    <Link
      href={`/chargers/${encodeURIComponent(charger.charger_id)}`}
      className={`card ${charger.status}${stale ? ' stale' : ''}`}
    >
      <div className="top">
        <div>
          <h2>{charger.name ?? charger.charger_id}</h2>
          <div className="id">{charger.charger_id}</div>
        </div>
        <StatusBadge status={charger.status} />
      </div>

      {latest ? (
        <dl>
          <div><dt>Voltage</dt><dd>{latest.voltage.toFixed(1)} V</dd></div>
          <div><dt>Current</dt><dd>{latest.current.toFixed(1)} A</dd></div>
          <div><dt>Power</dt><dd>{latest.power.toFixed(2)} kW</dd></div>
          <div><dt>Temperature</dt><dd>{latest.temperature.toFixed(1)} °C</dd></div>
        </dl>
      ) : (
        <p className="waiting">Waiting for first reading</p>
      )}

      <div className="foot">
        <span title="Where this charger's data comes from">
          {charger.source === 'ESP32' ? 'ESP32' : 'Simulated'}
          {' · '}
          {charger.status === 'OFFLINE' ? 'Last seen ' : 'Updated '}
          {timeAgo(charger.last_seen, now)}
        </span>
        {charger.active_alerts > 0 && (
          <span className="alert" title="Active alerts">
            ⚠ {charger.active_alerts} {charger.active_alerts === 1 ? 'alert' : 'alerts'}
          </span>
        )}
      </div>
    </Link>
  );
}
