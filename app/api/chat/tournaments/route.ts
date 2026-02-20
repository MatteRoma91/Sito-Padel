import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentParticipants } from '@/lib/db/queries';
import { getTournamentsFuture } from '@/lib/db/queries';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const futureTournaments = getTournamentsFuture();
  const participating = futureTournaments.filter(t => {
    const parts = getTournamentParticipants(t.id);
    return parts.some(p => p.user_id === user.id && p.participating);
  });

  const list = participating.map(t => ({
    id: t.id,
    name: t.name,
    date: t.date,
  }));

  return NextResponse.json({ success: true, tournaments: list });
}
