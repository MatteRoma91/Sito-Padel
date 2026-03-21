import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { 
  getTournamentById,
  getPairById,
  getMatches,
  deletePair,
  deleteMatches,
  deleteTournamentRankings,
  getPairs,
  getTournamentParticipants,
  updatePairsPlayersBatch,
  getDecidedMatchCountByPair
} from '@/lib/db/queries';
import { validatePairUpdates } from '@/lib/tournaments/pair-updates';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; pairId: string }> }
) {
  const { id: tournamentId, pairId } = await params;
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

  // Check tournament exists
  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
  }

  // Check pair exists and belongs to this tournament
  const pair = getPairById(pairId);
  if (!pair) {
    return NextResponse.json({ success: false, error: 'Coppia non trovata' }, { status: 404 });
  }

  if (pair.tournament_id !== tournamentId) {
    return NextResponse.json({ success: false, error: 'La coppia non appartiene a questo torneo' }, { status: 400 });
  }

  // Check if there are matches (don't allow deletion if bracket is generated)
  const matches = getMatches(tournamentId);
  if (matches.length > 0) {
    return NextResponse.json({ 
      success: false, 
      error: 'Non puoi eliminare coppie dopo aver generato il tabellone. Elimina prima il tabellone.' 
    }, { status: 400 });
  }

  try {
    // Delete any existing matches and rankings (safety)
    deleteMatches(tournamentId);
    deleteTournamentRankings(tournamentId);

    // Delete the pair
    deletePair(pairId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete pair error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pairId: string }> }
) {
  const { id: tournamentId, pairId } = await params;
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

  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
  }

  const pair = getPairById(pairId);
  if (!pair || pair.tournament_id !== tournamentId) {
    return NextResponse.json({ success: false, error: 'Coppia non trovata' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const player1_id = body?.player1_id as string | undefined;
    const player2_id = body?.player2_id as string | undefined;
    const acknowledgePlayedMatches = Boolean(body?.acknowledge_played_matches);

    const existingPairs = getPairs(tournamentId);
    const participants = getTournamentParticipants(tournamentId);
    const participatingUserIds = participants
      .filter((participant) => participant.participating)
      .map((participant) => participant.user_id);
    const decidedCounts = getDecidedMatchCountByPair(tournamentId);

    const validation = validatePairUpdates({
      existingPairs,
      updates: [{ pair_id: pairId, player1_id: player1_id || '', player2_id: player2_id || '' }],
      participatingUserIds,
      decidedPairIds: new Set(decidedCounts.keys()),
      acknowledgePlayedMatches,
    });

    if (!validation.ok) {
      const status = validation.code === 'NEED_ACK_PLAYED_MATCHES' ? 409 : 400;
      return NextResponse.json(
        {
          success: false,
          code: validation.code,
          error: validation.error || 'Modifica coppia non valida',
          needs_acknowledge_played_matches: validation.code === 'NEED_ACK_PLAYED_MATCHES',
        },
        { status }
      );
    }

    const next = validation.normalizedUpdates[0];
    const changed = pair.player1_id !== next.player1_id || pair.player2_id !== next.player2_id;
    if (!changed) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    updatePairsPlayersBatch([{ pairId, player1Id: next.player1_id, player2Id: next.player2_id }]);
    return NextResponse.json({ success: true, updated: 1 });
  } catch (error) {
    console.error('Patch pair error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
