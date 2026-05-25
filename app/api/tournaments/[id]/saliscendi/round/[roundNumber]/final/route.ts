import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { getTournamentById, getMatches, setSaliscendiRoundIsFinal } from '@/lib/db/queries';
import { getTournamentFormat } from '@/lib/types';
import { getSaliscendiMatchesForRound } from '@/lib/tournaments/saliscendi';
import { parseOrThrow, ValidationError } from '@/lib/validations';

const bodySchema = z.object({
  is_final: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; roundNumber: string }> }
) {
  const { id: tournamentId, roundNumber: roundStr } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(user) || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  const roundNumber = parseInt(roundStr, 10);
  if (!Number.isFinite(roundNumber) || roundNumber < 1) {
    return NextResponse.json({ success: false, error: 'Numero round non valido' }, { status: 400 });
  }

  try {
    const tournament = getTournamentById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
    }
    if (getTournamentFormat(tournament) !== 'saliscendi_12') {
      return NextResponse.json({ success: false, error: 'Questo torneo non è in formato Saliscendi' }, { status: 400 });
    }

    const body = await request.json();
    const { is_final } = parseOrThrow(bodySchema, body);

    const allMatches = getMatches(tournamentId);
    const roundMatches = getSaliscendiMatchesForRound(allMatches, roundNumber);
    if (roundMatches.length !== 3) {
      return NextResponse.json({ success: false, error: 'Round non trovato o incompleto' }, { status: 400 });
    }

    setSaliscendiRoundIsFinal(tournamentId, roundNumber, is_final);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Saliscendi set final error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
