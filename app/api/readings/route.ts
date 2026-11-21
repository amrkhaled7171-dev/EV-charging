import { NextResponse, type NextRequest } from 'next/server';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '@/lib/db';
import { config } from '@/lib/config';
import { computeStatus } from '@/lib/status';
import { syncFaultAlerts, resolveAlerts } from '@/lib/alerts';
import { formatIssues, readingSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/readings (section 8.1). The API key is checked in middleware.ts (401).
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
  }

  const parsed = readingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatIssues(parsed.error) },
      { status: 400 },
    );
  }
  const r = parsed.data;

  // Optional header X-Data-Source: SIMULATOR | ESP32. Stored in chargers.source (section 7.2).
  // If the header is absent the stored value is left unchanged.
  const rawSource = request.headers.get('x-data-source');
  const source = rawSource ? rawSource.trim().toUpperCase() : null;
  if (source !== null && source !== 'SIMULATOR' && source !== 'ESP32') {
    return NextResponse.json(
      { error: 'Invalid X-Data-Source header. Use SIMULATOR or ESP32' },
      { status: 400 },
    );
  }

  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [chargers] = await conn.query<RowDataPacket[]>(
      'SELECT charger_id, max_power_kw, maintenance_flag FROM chargers WHERE charger_id = ? FOR UPDATE',
      [r.charger_id],
    );
    if (chargers.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: `Unknown charger_id: ${r.charger_id}` }, { status: 404 });
    }

    const maxPower = chargers[0].max_power_kw === null ? null : Number(chargers[0].max_power_kw);
    if (maxPower !== null && r.power > maxPower) {
      await conn.rollback();
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: [{ field: 'power', message: `Must be between 0 and ${maxPower} kW for this charger` }],
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const recordedAt = r.timestamp ? new Date(r.timestamp) : now;

    const [insert] = await conn.query<ResultSetHeader>(
      `INSERT INTO readings
         (charger_id, voltage_v, current_a, power_kw, temperature_c, vehicle_connected, recorded_at, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.charger_id, r.voltage, r.current, r.power, r.temperature, r.vehicle_connected ? 1 : 0, recordedAt, now],
    );

    const { status, faults } = computeStatus({
      lastSeen: now,
      now,
      maintenanceFlag: Boolean(chargers[0].maintenance_flag),
      reading: r,
    });

    await conn.query(
      'UPDATE chargers SET status = ?, last_seen = ?, source = COALESCE(?, source) WHERE charger_id = ?',
      [status, now, source, r.charger_id],
    );

    const t = config.thresholds;
    await syncFaultAlerts(conn, r.charger_id, faults, {
      OVER_TEMP: `Temperature ${r.temperature} °C is above ${t.overTempC} °C`,
      OVER_CURRENT: `Current ${r.current} A is above ${t.overCurrentA} A`,
      BAD_VOLTAGE: `Voltage ${r.voltage} V is outside ${t.voltageMinV}-${t.voltageMaxV} V`,
    });
    // The charger is sending again, so any OFFLINE alert is resolved (section 9.3).
    await resolveAlerts(conn, r.charger_id, ['OFFLINE']);

    await conn.commit();
    return NextResponse.json(
      { reading_id: insert.insertId, charger_id: r.charger_id, status, faults },
      { status: 201 },
    );
  } catch (e) {
    if (conn) await conn.rollback().catch(() => undefined);
    console.error('[POST /api/readings]', e);
    return NextResponse.json({ error: 'Server or database error' }, { status: 500 });
  } finally {
    conn?.release();
  }
}
