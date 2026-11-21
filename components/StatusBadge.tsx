import type { ChargerStatus } from '@/lib/types';

export const STATUS_LABEL: Record<ChargerStatus, string> = {
  AVAILABLE: 'Available',
  IN_USE: 'In use',
  MAINTENANCE: 'Maintenance',
  OFFLINE: 'Offline',
};

// Status is always shown as text as well as colour (section 11.2).
export default function StatusBadge({ status }: { status: ChargerStatus }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>;
}
