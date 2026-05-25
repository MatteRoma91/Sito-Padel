import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getTournamentById,
  getPairs,
  getMatches,
  deleteSaliscendiMatches,
  insertMatches,
} from '@/lib/db/queries';
import { getTournamentFormat } from '@/lib/types';
import type { SaliscendiCourtTier } from '@/lib/types';
import { getMaxSaliscendiRoundNumber } from '@/lib/tournaments/saliscendi';
import { parseOrThrow, ValidationError } from '@/lib/validations';

const assignmentsSchema = z.object({
  oro: z.tuple([z.string().uuid(), z.string().uuid()]),
  argento: z.tuple([z.string().uuid(), z.string().uuid()]),
  bronzo: z.tuple([z.string().uuid(), z.string().uuid()]),
});

const bodySchema = z.object({
  assignments: assignmentsSchema,
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

    const pairs = getPairs(tournamentId);
    if (pairs.length !== 6) {
      return NextResponse.json({ success: false, error: 'Servono 6 coppie' }, { status: 400 });
    }

    const pairIds = new Set(pairs.map((p) => p.id));
    const allMatches = getMatches(tournamentId);
    const sal = allMatches.filter((m) => m.round === 'saliscendi');
    if (sal.length > 0) {
      const maxRn = getMaxSaliscendiRoundNumber(allMatches);
      const anyWinner = sal.some((m) => m.winner_pair_id);
      const onlyDraftRound1 = sal.length === 3 && maxRn === 1 && !anyWinner;
      if (!onlyDraftRound1) {
        return NextResponse.json(
          { success: false, error: 'Saliscendi già avviato o con risultati. Non è possibile ricreare il Round 1.' },
          { status: 400 }
        );
      }
      deleteSaliscendiMatches(tournamentId);
    }

    const body = await request.json();
    const { assignments, is_final_round } = parseOrThrow(bodySchema, body);

    const used = new Set<string>();
    const tiers: SaliscendiCourtTier[] = ['oro', 'argento', 'bronzo'];
    for (const tier of tiers) {
      const [a, b] = assignments[tier];
      if (a === b) {
        return NextResponse.json({ success: false, error: `Le due coppie su ${tier} devono essere diverse` }, { status: 400 });
      }
      if (!pairIds.has(a) || !pairIds.has(b)) {
        return NextResponse.json({ success: false, error: 'ID coppia non valido per questo torneo' }, { status: 400 });
      }
      for (const id of [a, b]) {
        if (used.has(id)) {
          return NextResponse.json({ success: false, error: 'Ogni coppia può comparire una sola volta nel Round 1' }, { status: 400 });
        }
        used.add(id);
      }
    }

    const isFinal = is_final_round ? 1 : 0;
    const order: Record<SaliscendiCourtTier, number> = { oro: 0, argento: 1, bronzo: 2 };

    insertMatches(
      tournamentId,
      tiers.map((tier) => ({
        round: 'saliscendi' as const,
        bracket_type: 'main' as const,
        pair1_id: assignments[tier][0],
        pair2_id: assignments[tier][1],
        score_pair1: null,
        score_pair2: null,
        winner_pair_id: null,
        order_in_round: order[tier],
        round_number: 1,
        court_tier: tier,
        is_final_round: isFinal,
      }))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Saliscendi round1 error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
