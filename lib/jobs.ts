import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { config } from './config';
import { pool } from './db';
import { openAlertIfMissing } from './alerts';

/** Marks chargers OFFLINE when no reading arrived within the timeout (section 9.4). */
export async function markStaleOffline(): Promise<number> {
  const cutoff = new Date(Date.now() - config.staleTimeoutSec * 1000);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT charger_id FROM chargers WHERE status <> 'OFFLINE' AND (last_seen IS NULL OR last_seen < ?) FOR UPDATE",
      [cutoff],
    );
    for (const row of rows) {
      const id = row.charger_id as string;
      await conn.query("UPDATE chargers SET status = 'OFFLINE' WHERE charger_id = ?", [id]);
      await openAlertIfMissing(
        conn,
        id,
        'OFFLINE',
        `No reading received for more than ${config.staleTimeoutSec} seconds`,
      );
    }
    await conn.commit();
    return rows.length;
  } catch (e) {
    await conn.rollback().catch(() => undefined);
    throw e;
  } finally {
    conn.release();
  }
}

/** Deletes raw readings older than the retention period (section 7.3). */
export async function purgeOldReadings(): Promise<number> {
  const cutoff = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM readings WHERE recorded_at < ?', [
    cutoff,
  ]);
  return result.affectedRows;
}

function guarded(name: string, fn: () => Promise<number>) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      const n = await fn();
      if (n > 0) console.log(`[jobs] ${name}: ${n} row(s)`);
    } catch (e) {
      console.error(`[jobs] ${name} failed:`, e);
    } finally {
      running = false;
    }
  };
}

/** Starts the timers once per process (globalThis guard protects against hot reload). */
export function startJobs(): void {
  const g = globalThis as unknown as { __evJobsStarted?: boolean };
  if (g.__evJobsStarted) return;
  g.__evJobsStarted = true;

  setInterval(guarded('markStaleOffline', markStaleOffline), config.offlineJobIntervalSec * 1000);
  setInterval(guarded('purgeOldReadings', purgeOldReadings), config.purgeIntervalMin * 60 * 1000);
  console.log('[jobs] started: offline detection + retention purge');
}
