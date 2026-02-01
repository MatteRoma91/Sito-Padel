import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPairs, deleteMatches, insertMatches } from '@/lib/db/queries';
import { generateBracket } from '@/lib/bracket';

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
    const pairs = getPairs(tournamentId);
    
    if (pairs.length !== 8) {
      return NextResponse.json({ 
        success: false, 
        error: `Servono 8 coppie per generare il tabellone, trovate ${pairs.length}` 
      }, { status: 400 });
    }

    // Generate bracket
    const matches = generateBracket(pairs);

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
