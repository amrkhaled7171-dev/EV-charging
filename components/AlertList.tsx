import type { AlertItem } from '@/lib/types';

export default function AlertList({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) return <p className="empty">No alerts for this charger.</p>;
  return (
    <table className="alerts">
      <thead>
        <tr><th>Type</th><th>Message</th><th>Raised</th><th>State</th></tr>
      </thead>
      <tbody>
        {alerts.slice(0, 20).map((a) => (
          <tr key={a.alert_id}>
            <td>{a.type}</td>
            <td>{a.message ?? '-'}</td>
            <td>{new Date(a.created_at).toLocaleString()}</td>
            <td>
              {a.resolved_at ? (
                <span className="tag done">Resolved</span>
              ) : (
                <span className="tag open">Active</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
