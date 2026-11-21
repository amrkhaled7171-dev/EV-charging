import type { ChargerStatus, ChargerSummary } from '@/lib/types';
import { STATUS_LABEL } from './StatusBadge';

const ORDER: ChargerStatus[] = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OFFLINE'];

export default function SummaryBar({ chargers }: { chargers: ChargerSummary[] }) {
  return (
    <div className="summary" aria-label="Charger counts by status">
      {ORDER.map((s) => (
        <div key={s} className={s}>
          <strong>{chargers.filter((c) => c.status === s).length}</strong>
          <span>{STATUS_LABEL[s]}</span>
        </div>
      ))}
    </div>
  );
}
