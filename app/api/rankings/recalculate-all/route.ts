import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getTournaments,
  getPairs,
  getMatches,
  getTournamentRankings,
  deleteTournamentRankings,
  insertTournamentRanking,
  recalculateCumulativeRankings,
  applyTournamentResultToOverall,
  resetAllPlayerOverallToBaseline,
  clearAllTournamentOverallAppliedFlags,
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
  if (!canEdit(user)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
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

    // Reset completo baseline + replay da classifica finale (non dai match)
    // Funziona anche per tornei storici senza match salvati nel DB
    resetAllPlayerOverallToBaseline();
    clearAllTournamentOverallAppliedFlags();

    for (const tournament of completed) {
      const pairs = getPairs(tournament.id);
      const existingRankings = getTournamentRankings(tournament.id);

      // Tornei con match completi: ricalcola anche i ranking ATP
      const matches = getMatches(tournament.id);
      if (isTournamentComplete(matches) && pairs.length > 0) {
        const category: TournamentCategory = tournament.category ?? 'master_1000';
        const rankings = calculateTournamentRankings(pairs, matches, category);
        deleteTournamentRankings(tournament.id);
        for (const r of rankings) {
          insertTournamentRanking(r);
        }
      }

      // Overall: si applica se esiste una classifica (con o senza match)
      if (existingRankings.length > 0 || pairs.length > 0) {
        applyTournamentResultToOverall(tournament.id);
        recalculated++;
      }
    }

    recalculateCumulativeRankings();

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
