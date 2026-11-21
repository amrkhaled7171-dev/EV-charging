'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryPoint } from '@/lib/types';

const METRICS = [
  { key: 'power', label: 'Power (kW)' },
  { key: 'current', label: 'Current (A)' },
  { key: 'voltage', label: 'Voltage (V)' },
  { key: 'temperature', label: 'Temperature (°C)' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

export default function HistoryChart({ points }: { points: HistoryPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>('power');
  const label = METRICS.find((m) => m.key === metric)!.label;
  const data = points.map((p) => ({
    time: new Date(p.recorded_at).toLocaleTimeString(),
    value: p[metric],
  }));

  return (
    <div>
      <div className="tabs" role="group" aria-label="Chart metric">
        {METRICS.map((m) => (
          <button key={m.key} aria-pressed={metric === m.key} onClick={() => setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      {data.length === 0 ? (
        <p className="empty">No readings stored for this charger yet.</p>
      ) : (
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dce3" />
              <XAxis dataKey="time" minTickGap={40} />
              <YAxis domain={['auto', 'auto']} width={48} />
              <Tooltip formatter={(v) => [String(v), label]} />
              <Line type="monotone" dataKey="value" stroke="#2160c4" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
