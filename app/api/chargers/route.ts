import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '@/lib/db';
import type { ChargerSummary } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

// GET /api/chargers (section 8.2): every charger with status, latest reading and active alerts.
export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT c.charger_id, c.station_id, c.name, c.max_power_kw, c.status,
             c.maintenance_flag, c.last_seen, c.source,
             r.voltage_v, r.current_a, r.power_kw, r.temperature_c,
             r.vehicle_connected, r.recorded_at,
             (SELECT COUNT(*) FROM alerts a
               WHERE a.charger_id = c.charger_id AND a.resolved_at IS NULL) AS active_alerts
      FROM chargers c
      LEFT JOIN readings r
        ON r.reading_id = (
          SELECT r2.reading_id FROM readings r2
          WHERE r2.charger_id = c.charger_id
          ORDER BY r2.recorded_at DESC, r2.reading_id DESC
          LIMIT 1
        )
      ORDER BY c.charger_id
    `);

    const result: ChargerSummary[] = rows.map((row) => ({
      charger_id: row.charger_id,
      name: row.name,
      station_id: row.station_id,
      status: row.status,
      maintenance_flag: Boolean(row.maintenance_flag),
      source: row.source,
      max_power_kw: row.max_power_kw === null ? null : Number(row.max_power_kw),
      last_seen: iso(row.last_seen),
      latest:
        row.recorded_at === null
          ? null
          : {
              voltage: Number(row.voltage_v),
              current: Number(row.current_a),
              power: Number(row.power_kw),
              temperature: Number(row.temperature_c),
              vehicle_connected: Boolean(row.vehicle_connected),
              recorded_at: row.recorded_at.toISOString(),
            },
      active_alerts: Number(row.active_alerts),
    }));
    return NextResponse.json(result);
  } catch (e) {
    console.error('[GET /api/chargers]', e);
    return NextResponse.json({ error: 'Server or database error' }, { status: 500 });
  }
}
