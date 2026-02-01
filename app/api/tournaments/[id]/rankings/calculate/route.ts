import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getPairs, 
  getMatches, 
  deleteTournamentRankings, 
  insertTournamentRanking,
  recalculateCumulativeRankings,
  updateTournament
} from '@/lib/db/queries';
import { calculateTournamentRankings, isTournamentComplete } from '@/lib/rankings';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const pairs = getPairs(tournamentId);
    const matches = getMatches(tournamentId);

    if (!isTournamentComplete(matches)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Il torneo non è ancora completo. Inserisci tutti i risultati.' 
      }, { status: 400 });
    }

    // Calculate rankings
    const rankings = calculateTournamentRankings(pairs, matches);

    // Save rankings
    deleteTournamentRankings(tournamentId);
    for (const r of rankings) {
      insertTournamentRanking(r);
    }

    // Update cumulative rankings
    recalculateCumulativeRankings();

    // Update tournament status to completed
    updateTournament(tournamentId, { status: 'completed' });

    return NextResponse.json({ success: true, rankings });
  } catch (error) {
    console.error('Calculate rankings error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
