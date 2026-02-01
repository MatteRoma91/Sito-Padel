import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getTournamentById,
  getPairById,
  getMatches,
  deletePair,
  deleteMatches,
  deleteTournamentRankings
} from '@/lib/db/queries';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; pairId: string }> }
) {
  const { id: tournamentId, pairId } = await params;
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
