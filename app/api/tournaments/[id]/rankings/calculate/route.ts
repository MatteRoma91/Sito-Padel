import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getPairs, 
  getMatches, 
  getTournamentById,
  deleteTournamentRankings, 
  insertTournamentRanking,
  recalculateCumulativeRankings,
  applyTournamentResultToOverall,
  updateTournament
} from '@/lib/db/queries';
import { calculateTournamentRankings, isTournamentComplete } from '@/lib/rankings';
import type { TournamentCategory } from '@/lib/types';

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
    const tournament = getTournamentById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
    }

    const pairs = getPairs(tournamentId);
    const matches = getMatches(tournamentId);

    if (!isTournamentComplete(matches)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Il torneo non è ancora completo. Inserisci tutti i risultati.' 
      }, { status: 400 });
    }

    const category: TournamentCategory = tournament.category ?? 'master_1000';

    // Calculate rankings (points depend on tournament category)
    const rankings = calculateTournamentRankings(pairs, matches, category);

    // Save rankings
    deleteTournamentRankings(tournamentId);
    for (const r of rankings) {
      insertTournamentRanking(r);
    }

    // Update cumulative rankings
    recalculateCumulativeRankings();

    // Update overall score (partita +1/-1, 1° +2, 8° -2)
    applyTournamentResultToOverall(tournamentId);

    // Update tournament status to completed
    updateTournament(tournamentId, { status: 'completed' });

    return NextResponse.json({ success: true, rankings });
  } catch (error) {
    console.error('Calculate rankings error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
