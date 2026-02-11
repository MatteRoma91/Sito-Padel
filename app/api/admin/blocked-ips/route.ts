import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getBlockedIps } from '@/lib/db/queries';

export async function GET() {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const blocked = getBlockedIps();
  return NextResponse.json({ blocked });
}
