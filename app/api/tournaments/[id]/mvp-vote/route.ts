import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { submitMvpVote, getMvpVotingStatus } from '@/lib/db/queries';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { id: tournamentId } = await params;

  try {
    const { votedUserId } = await request.json();
    if (!votedUserId || typeof votedUserId !== 'string') {
      return NextResponse.json({ error: 'votedUserId richiesto' }, { status: 400 });
    }

    const ok = submitMvpVote(tournamentId, user.id, votedUserId.trim());
    if (!ok) {
      return NextResponse.json(
        { error: 'Voto non valido. Verifica di essere partecipante e di non votare te stesso.' },
        { status: 400 }
      );
    }

    const status = getMvpVotingStatus(tournamentId, user.id);
    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  }
}
