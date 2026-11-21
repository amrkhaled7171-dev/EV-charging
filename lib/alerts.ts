import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { AlertType, FaultType } from './types';

const FAULT_TYPES: FaultType[] = ['OVER_TEMP', 'OVER_CURRENT', 'BAD_VOLTAGE'];

export async function openAlertIfMissing(
  conn: PoolConnection,
  chargerId: string,
  type: AlertType,
  message: string,
): Promise<void> {
  const [rows] = await conn.query<RowDataPacket[]>(
    'SELECT alert_id FROM alerts WHERE charger_id = ? AND type = ? AND resolved_at IS NULL LIMIT 1',
    [chargerId, type],
  );
  if (rows.length > 0) return;
  await conn.query<ResultSetHeader>(
    'INSERT INTO alerts (charger_id, type, message, created_at) VALUES (?, ?, ?, ?)',
    [chargerId, type, message.slice(0, 255), new Date()],
  );
}

export async function resolveAlerts(
  conn: PoolConnection,
  chargerId: string,
  types: AlertType[],
): Promise<void> {
  if (types.length === 0) return;
  await conn.query(
    'UPDATE alerts SET resolved_at = ? WHERE charger_id = ? AND resolved_at IS NULL AND type IN (?)',
    [new Date(), chargerId, types],
  );
}

/** Opens an alert for each current fault and resolves fault alerts that are no longer true. */
export async function syncFaultAlerts(
  conn: PoolConnection,
  chargerId: string,
  faults: FaultType[],
  messages: Record<FaultType, string>,
): Promise<void> {
  for (const f of faults) await openAlertIfMissing(conn, chargerId, f, messages[f]);
  await resolveAlerts(
    conn,
    chargerId,
    FAULT_TYPES.filter((t) => !faults.includes(t)),
  );
}
