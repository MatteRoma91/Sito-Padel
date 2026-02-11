import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentById, getPairs, deleteMatches, insertMatches } from '@/lib/db/queries';
import { generateBracket, generateRoundRobinFor4Pairs } from '@/lib/bracket';

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

  try {
    const tournament = getTournamentById(tournamentId);
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
    }

    const pairs = getPairs(tournamentId);

    const expectedPairs = tournament.max_players === 8 ? 4 : 8;
    if (pairs.length !== expectedPairs) {
      return NextResponse.json({ 
        success: false, 
        error: `Servono ${expectedPairs} coppie per generare la struttura, trovate ${pairs.length}` 
      }, { status: 400 });
    }

    // Generate bracket / girone
    const matches = expectedPairs === 4 ? generateRoundRobinFor4Pairs(pairs) : generateBracket(pairs);

    // Delete existing matches
    deleteMatches(tournamentId);

    // Insert new matches
    insertMatches(tournamentId, matches);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Generate bracket error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
