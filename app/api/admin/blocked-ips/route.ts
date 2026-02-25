import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getBlockedAttempts } from '@/lib/db/queries';

export async function GET() {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const blocked = getBlockedAttempts();
  return NextResponse.json({ blocked });
}
