import { NextResponse, type NextRequest } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '@/lib/db';
import type { HistoryPoint } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/chargers/:id/readings?limit=100  (oldest first, ready for charting)
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const raw = Number(request.nextUrl.searchParams.get('limit') ?? 100);
  const limit = Number.isInteger(raw) && raw >= 1 ? Math.min(raw, 1000) : 100;

  try {
    const [found] = await pool.query<RowDataPacket[]>(
      'SELECT charger_id FROM chargers WHERE charger_id = ?',
      [id],
    );
    if (found.length === 0) {
      return NextResponse.json({ error: `Unknown charger_id: ${id}` }, { status: 404 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT reading_id, voltage_v, current_a, power_kw, temperature_c, vehicle_connected, recorded_at
       FROM readings WHERE charger_id = ?
       ORDER BY recorded_at DESC, reading_id DESC LIMIT ?`,
      [id, limit],
    );

    const history: HistoryPoint[] = rows
      .map((row) => ({
        reading_id: Number(row.reading_id),
        voltage: Number(row.voltage_v),
        current: Number(row.current_a),
        power: Number(row.power_kw),
        temperature: Number(row.temperature_c),
        vehicle_connected: Boolean(row.vehicle_connected),
        recorded_at: row.recorded_at.toISOString(),
      }))
      .reverse();
    return NextResponse.json(history);
  } catch (e) {
    console.error('[GET /api/chargers/:id/readings]', e);
    return NextResponse.json({ error: 'Server or database error' }, { status: 500 });
  }
}
