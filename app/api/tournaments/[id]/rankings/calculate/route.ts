import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getPairs,
  getMatches,
  getTournamentById,
  deleteTournamentRankings,
  insertTournamentRanking,
  recalculateCumulativeRankings,
  applyTournamentResultToOverall,
  updateTournament,
} from '@/lib/db/queries';
import { getDb } from '@/lib/db/db';
import { calculateTournamentRankings, isTournamentComplete } from '@/lib/rankings';
import { sendPushToTournamentParticipants } from '@/lib/notifications/push';
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
  if (!canEdit(user)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const db = getDb();
    const rankings = db.transaction(
      () => {
        const tournament = getTournamentById(tournamentId);
        if (!tournament) {
          throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const });
        }

        if (tournament.overall_applied_at) {
          throw Object.assign(new Error('ALREADY_APPLIED'), { code: 'ALREADY_APPLIED' as const });
        }

        const pairs = getPairs(tournamentId);
        const matches = getMatches(tournamentId);

        if (!isTournamentComplete(matches)) {
          throw Object.assign(new Error('INCOMPLETE'), { code: 'INCOMPLETE' as const });
        }

        const category: TournamentCategory = tournament.category ?? 'master_1000';
        const calculated = calculateTournamentRankings(pairs, matches, category);

        deleteTournamentRankings(tournamentId);
        for (const r of calculated) {
          insertTournamentRanking(r);
        }

        recalculateCumulativeRankings();
        applyTournamentResultToOverall(tournamentId);

        updateTournament(tournamentId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        return calculated;
      },
      { behavior: 'immediate' }
    )();

    const tournament = getTournamentById(tournamentId);

    void sendPushToTournamentParticipants(tournamentId, {
      title: 'Torneo completato',
      body: `${tournament?.name ?? 'Torneo'}: classifica aggiornata.`,
      url: `/tournaments/${tournamentId}`,
    }).catch(() => undefined);

    return NextResponse.json({ success: true, rankings });
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
    if (code === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
    }
    if (code === 'ALREADY_APPLIED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Classifica già consolidata per questo torneo. Riapri il torneo per ricalcolare.',
        },
        { status: 409 }
      );
    }
    if (code === 'INCOMPLETE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Il torneo non è ancora completo. Inserisci tutti i risultati.',
        },
        { status: 400 }
      );
    }
    console.error('Calculate rankings error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
