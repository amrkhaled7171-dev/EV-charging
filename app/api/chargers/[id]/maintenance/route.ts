import { NextResponse, type NextRequest } from 'next/server';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '@/lib/db';
import { computeStatus } from '@/lib/status';
import { openAlertIfMissing, resolveAlerts } from '@/lib/alerts';
import { formatIssues, maintenanceSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/chargers/:id/maintenance  body: { "maintenance": true | false }
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
  }
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatIssues(parsed.error) },
      { status: 400 },
    );
  }
  const flag = parsed.data.maintenance;

  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [chargers] = await conn.query<RowDataPacket[]>(
      'SELECT charger_id, last_seen FROM chargers WHERE charger_id = ? FOR UPDATE',
      [id],
    );
    if (chargers.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: `Unknown charger_id: ${id}` }, { status: 404 });
    }

    const [latest] = await conn.query<RowDataPacket[]>(
      `SELECT voltage_v, current_a, temperature_c, vehicle_connected
       FROM readings WHERE charger_id = ? ORDER BY recorded_at DESC, reading_id DESC LIMIT 1`,
      [id],
    );
    const reading = latest[0]
      ? {
          voltage: Number(latest[0].voltage_v),
          current: Number(latest[0].current_a),
          temperature: Number(latest[0].temperature_c),
          vehicle_connected: Boolean(latest[0].vehicle_connected),
        }
      : null;

    const { status } = computeStatus({
      lastSeen: chargers[0].last_seen,
      now: new Date(),
      maintenanceFlag: flag,
      reading,
    });

    await conn.query('UPDATE chargers SET maintenance_flag = ?, status = ? WHERE charger_id = ?', [
      flag ? 1 : 0,
      status,
      id,
    ]);

    if (flag) await openAlertIfMissing(conn, id, 'OTHER', 'Maintenance flag set manually');
    else await resolveAlerts(conn, id, ['OTHER']);

    await conn.commit();
    return NextResponse.json({ charger_id: id, maintenance_flag: flag, status });
  } catch (e) {
    if (conn) await conn.rollback().catch(() => undefined);
    console.error('[POST /api/chargers/:id/maintenance]', e);
    return NextResponse.json({ error: 'Server or database error' }, { status: 500 });
  } finally {
    conn?.release();
  }
}
