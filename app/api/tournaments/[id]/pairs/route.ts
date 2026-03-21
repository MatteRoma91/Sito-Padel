import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { 
  getTournamentById,
  getPairs,
  getTournamentParticipants,
  insertSinglePair,
  deleteMatches,
  deleteTournamentRankings,
  updatePairsPlayersBatch,
  getDecidedMatchCountByPair
} from '@/lib/db/queries';
import { validatePairUpdates, type PairUpdateInput } from '@/lib/tournaments/pair-updates';

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

  // Check tournament exists
  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
  }

  try {
    const { player1_id, player2_id } = await request.json();

    if (!player1_id || !player2_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Entrambi i giocatori sono richiesti' 
      }, { status: 400 });
    }

    if (player1_id === player2_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'I due giocatori devono essere diversi' 
      }, { status: 400 });
    }

    // Check if already at max pairs
    const existingPairs = getPairs(tournamentId);
    if (existingPairs.length >= 8) {
      return NextResponse.json({ 
        success: false, 
        error: 'Numero massimo di coppie raggiunto (8)' 
      }, { status: 400 });
    }

    // Check if players are already in a pair
    const playersInPairs = new Set<string>();
    existingPairs.forEach(p => {
      playersInPairs.add(p.player1_id);
      playersInPairs.add(p.player2_id);
    });

    if (playersInPairs.has(player1_id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Il primo giocatore è già in una coppia' 
      }, { status: 400 });
    }

    if (playersInPairs.has(player2_id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Il secondo giocatore è già in una coppia' 
      }, { status: 400 });
    }

    // Delete any existing matches and rankings (if adding pairs manually, reset the bracket)
    deleteMatches(tournamentId);
    deleteTournamentRankings(tournamentId);

    // Insert the new pair
    const pairId = insertSinglePair(tournamentId, player1_id, player2_id);

    return NextResponse.json({ success: true, pairId });
  } catch (error) {
    console.error('Add pair error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}

export async function PATCH(
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

  const tournament = getTournamentById(tournamentId);
  if (!tournament) {
    return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updates = (body?.updates ?? []) as PairUpdateInput[];
    const acknowledgePlayedMatches = Boolean(body?.acknowledge_played_matches);

    const existingPairs = getPairs(tournamentId);
    const participants = getTournamentParticipants(tournamentId);
    const participatingUserIds = participants
      .filter((participant) => participant.participating)
      .map((participant) => participant.user_id);

    const decidedCounts = getDecidedMatchCountByPair(tournamentId);
    const validation = validatePairUpdates({
      existingPairs,
      updates,
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
          error: validation.error || 'Modifica coppie non valida',
          needs_acknowledge_played_matches: validation.code === 'NEED_ACK_PLAYED_MATCHES',
        },
        { status }
      );
    }

    const changedUpdates = validation.normalizedUpdates.filter((update) => {
      const pair = existingPairs.find((currentPair) => currentPair.id === update.pair_id);
      return !!pair && (pair.player1_id !== update.player1_id || pair.player2_id !== update.player2_id);
    });

    if (changedUpdates.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    updatePairsPlayersBatch(
      changedUpdates.map((update) => ({
        pairId: update.pair_id,
        player1Id: update.player1_id,
        player2Id: update.player2_id,
      }))
    );

    return NextResponse.json({ success: true, updated: changedUpdates.length });
  } catch (error) {
    console.error('Update pairs composition error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
