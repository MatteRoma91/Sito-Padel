import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { getMatchById, getMatches, updateMatchResult, updateMatchPairs } from '@/lib/db/queries';
import { propagateResults } from '@/lib/bracket';
import { parseOrThrow, matchScoreSchema, ValidationError } from '@/lib/validations';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: tournamentId, matchId } = await params;
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
    const body = await request.json();
    const { score_pair1, score_pair2 } = parseOrThrow(matchScoreSchema, body);

    const match = getMatchById(matchId);
    if (!match || match.tournament_id !== tournamentId) {
      return NextResponse.json({ success: false, error: 'Match non trovato' }, { status: 404 });
    }

    if (!match.pair1_id || !match.pair2_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Le coppie non sono ancora state determinate per questo match' 
      }, { status: 400 });
    }

    // Determine winner
    const winnerId = score_pair1 > score_pair2 ? match.pair1_id : match.pair2_id;

    // Update match result
    updateMatchResult(matchId, score_pair1, score_pair2, winnerId);

    // Emit live score via WebSocket (when custom server is running)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require for optional WS
      const { getIo } = require('@/lib/socket');
      const io = getIo();
      io.to(`tournament:${tournamentId}`).emit('match:score', {
        matchId,
        score_pair1,
        score_pair2,
        winner_pair_id: winnerId,
      });
    } catch {
      // Socket.io not initialized (e.g. next dev without custom server)
    }

    // Propagate results to next matches
    const allMatches = getMatches(tournamentId);
    // Update the current match in our local array
    const updatedMatches = allMatches.map(m => 
      m.id === matchId 
        ? { ...m, score_pair1, score_pair2, winner_pair_id: winnerId }
        : m
    );

    const updates = propagateResults(updatedMatches);
    for (const update of updates) {
      updateMatchPairs(update.matchId, update.pair1_id, update.pair2_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Submit result error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
