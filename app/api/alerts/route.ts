import { NextResponse, type NextRequest } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '@/lib/db';
import type { AlertItem } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/alerts?active=true&charger_id=CH-001
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const where: string[] = [];
  const values: string[] = [];
  if (params.get('active') === 'true') where.push('resolved_at IS NULL');
  const chargerId = params.get('charger_id');
  if (chargerId) {
    where.push('charger_id = ?');
    values.push(chargerId);
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT alert_id, charger_id, type, message, created_at, resolved_at
       FROM alerts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY created_at DESC, alert_id DESC LIMIT 200`,
      values,
    );
    const alerts: AlertItem[] = rows.map((row) => ({
      alert_id: Number(row.alert_id),
      charger_id: row.charger_id,
      type: row.type,
      message: row.message,
      created_at: row.created_at.toISOString(),
      resolved_at: row.resolved_at ? row.resolved_at.toISOString() : null,
    }));
    return NextResponse.json(alerts);
  } catch (e) {
    console.error('[GET /api/alerts]', e);
    return NextResponse.json({ error: 'Server or database error' }, { status: 500 });
  }
}
