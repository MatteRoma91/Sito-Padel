import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMatchById, updateMatchPairs, getPairs, getMatches } from '@/lib/db/queries';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: tournamentId, matchId } = await params;
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Solo gli admin possono modificare i match' }, { status: 403 });
  }

  try {
    const match = getMatchById(matchId);
    
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match non trovato' }, { status: 404 });
    }

    if (match.tournament_id !== tournamentId) {
      return NextResponse.json({ success: false, error: 'Match non appartiene a questo torneo' }, { status: 400 });
    }

    // Cannot modify match if it already has a result
    if (match.winner_pair_id) {
      return NextResponse.json({ success: false, error: 'Non puoi modificare un match già completato' }, { status: 400 });
    }

    const { pair1_id, pair2_id } = await request.json();

    // Validate pairs belong to tournament
    const pairs = getPairs(tournamentId);
    const pairIds = new Set(pairs.map(p => p.id));

    if (pair1_id && !pairIds.has(pair1_id)) {
      return NextResponse.json({ success: false, error: 'Coppia 1 non appartiene al torneo' }, { status: 400 });
    }

    if (pair2_id && !pairIds.has(pair2_id)) {
      return NextResponse.json({ success: false, error: 'Coppia 2 non appartiene al torneo' }, { status: 400 });
    }

    if (pair1_id && pair2_id && pair1_id === pair2_id) {
      return NextResponse.json({ success: false, error: 'Le due coppie devono essere diverse' }, { status: 400 });
    }

    // Check if pairs are already assigned to other matches in same round (except current match)
    const matches = getMatches(tournamentId);
    const sameRoundMatches = matches.filter(m => 
      m.round === match.round && 
      m.bracket_type === match.bracket_type && 
      m.id !== matchId
    );

    for (const m of sameRoundMatches) {
      if (pair1_id && (m.pair1_id === pair1_id || m.pair2_id === pair1_id)) {
        return NextResponse.json({ success: false, error: 'Coppia 1 già assegnata ad un altro match di questo round' }, { status: 400 });
      }
      if (pair2_id && (m.pair1_id === pair2_id || m.pair2_id === pair2_id)) {
        return NextResponse.json({ success: false, error: 'Coppia 2 già assegnata ad un altro match di questo round' }, { status: 400 });
      }
    }

    updateMatchPairs(matchId, pair1_id || null, pair2_id || null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update match pairs error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
