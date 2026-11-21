import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/health: backend and database health check.
export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ status: 'ok', database: 'up', time: new Date().toISOString() });
  } catch (e) {
    console.error('[GET /api/health]', e);
    return NextResponse.json(
      { status: 'error', database: 'down', time: new Date().toISOString() },
      { status: 500 },
    );
  }
}
