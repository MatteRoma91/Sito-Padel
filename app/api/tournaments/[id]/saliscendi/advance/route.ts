import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getTournamentById,
  getMatches,
  insertMatches,
} from '@/lib/db/queries';
import { getTournamentFormat } from '@/lib/types';
import type { SaliscendiCourtTier } from '@/lib/types';
import {
  computeNextSaliscendiPairings,
  getMaxSaliscendiRoundNumber,
  getSaliscendiMatchesForRound,
} from '@/lib/tournaments/saliscendi';
import { parseOrThrow, ValidationError } from '@/lib/validations';

const bodySchema = z.object({
  is_final_round: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(user) || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const tournament = getTournamentById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
    }
    if (getTournamentFormat(tournament) !== 'saliscendi_12') {
      return NextResponse.json({ success: false, error: 'Questo torneo non è in formato Saliscendi' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { is_final_round } = parseOrThrow(bodySchema, body);

    const allMatches = getMatches(tournamentId);
    const maxRn = getMaxSaliscendiRoundNumber(allMatches);
    if (maxRn < 1) {
      return NextResponse.json({ success: false, error: 'Avvia prima il Round 1' }, { status: 400 });
    }

    const currentRoundMatches = getSaliscendiMatchesForRound(allMatches, maxRn);
    if (currentRoundMatches.length !== 3) {
      return NextResponse.json({ success: false, error: 'Round corrente incompleto' }, { status: 400 });
    }
    if (currentRoundMatches.some((m) => !m.winner_pair_id)) {
      return NextResponse.json({ success: false, error: 'Inserisci tutti i risultati del round corrente prima di avanzare' }, { status: 400 });
    }
    if (currentRoundMatches.some((m) => (m.is_final_round ?? 0) === 1)) {
      return NextResponse.json(
        { success: false, error: 'Questo era l\'ultimo round: non puoi avanzare. Calcola la classifica.' },
        { status: 400 }
      );
    }

    const nextRn = maxRn + 1;
    const pairings = computeNextSaliscendiPairings(currentRoundMatches);
    const isFinal = is_final_round ? 1 : 0;
    const order: Record<SaliscendiCourtTier, number> = { oro: 0, argento: 1, bronzo: 2 };

    insertMatches(
      tournamentId,
      pairings.map((p) => ({
        round: 'saliscendi' as const,
        bracket_type: 'main' as const,
        pair1_id: p.pair1_id,
        pair2_id: p.pair2_id,
        score_pair1: null,
        score_pair2: null,
        winner_pair_id: null,
        order_in_round: order[p.tier],
        round_number: nextRn,
        court_tier: p.tier,
        is_final_round: isFinal,
      }))
    );

    return NextResponse.json({ success: true, round_number: nextRn });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
