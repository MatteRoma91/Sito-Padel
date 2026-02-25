import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMatchById, getMatches, updateMatchResult, updateMatchPairs } from '@/lib/db/queries';
import { propagateResults } from '@/lib/bracket';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: tournamentId, matchId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const { score_pair1, score_pair2 } = await request.json();

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

    if (typeof score_pair1 !== 'number' || typeof score_pair2 !== 'number' || 
        score_pair1 < 0 || score_pair2 < 0 || score_pair1 === score_pair2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Punteggi non validi (devono essere numeri diversi >= 0)' 
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
    console.error('Submit result error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
