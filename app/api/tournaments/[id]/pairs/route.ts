import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getTournamentById,
  getPairs,
  insertSinglePair,
  deleteMatches,
  deleteTournamentRankings
} from '@/lib/db/queries';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
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
