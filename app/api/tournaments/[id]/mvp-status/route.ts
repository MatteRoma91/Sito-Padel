import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentById, getMvpVotingStatus } from '@/lib/db/queries';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const user = await getCurrentUser();

  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });
  }

  const status = getMvpVotingStatus(tournamentId, user?.id ?? null);
  return NextResponse.json({ status, tournamentName: tournament.name });
}
