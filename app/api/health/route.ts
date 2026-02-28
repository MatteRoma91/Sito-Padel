import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/db';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const row = getDb().prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    if (row?.ok !== 1) throw new Error('DB check failed');
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: 'error', error: (e as Error).message },
      { status: 503 }
    );
  }
}
