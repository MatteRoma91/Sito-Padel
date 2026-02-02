import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getTournaments,
  getPairs,
  getMatches,
  deleteTournamentRankings,
  insertTournamentRanking,
  recalculateCumulativeRankings,
  applyTournamentResultToOverall,
  seedOverallScores,
} from '@/lib/db/queries';
import { calculateTournamentRankings, isTournamentComplete } from '@/lib/rankings';
import type { TournamentCategory } from '@/lib/types';

/**
 * Ricalcola i punteggi di tutti i tornei completati usando il sistema per categoria
 * (Grande Slam / Master 1000). Aggiorna tournament_rankings e cumulative_rankings.
 */
export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const allTournaments = getTournaments();
    const completed = allTournaments
      .filter(t => t.status === 'completed')
      .sort((a, b) => a.date.localeCompare(b.date));
    let recalculated = 0;

    for (const tournament of completed) {
      const pairs = getPairs(tournament.id);
      const matches = getMatches(tournament.id);

      if (!isTournamentComplete(matches) || pairs.length === 0) continue;

      const category: TournamentCategory = tournament.category ?? 'master_1000';
      const rankings = calculateTournamentRankings(pairs, matches, category);

      deleteTournamentRankings(tournament.id);
      for (const r of rankings) {
        insertTournamentRanking(r);
      }
      applyTournamentResultToOverall(tournament.id);
      recalculated++;
    }

    recalculateCumulativeRankings();
    seedOverallScores();

    return NextResponse.json({
      success: true,
      recalculated,
      totalCompleted: completed.length,
    });
  } catch (error) {
    console.error('Recalculate all rankings error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
