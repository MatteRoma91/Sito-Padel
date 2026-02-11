import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentById, getTournamentParticipants, setParticipating, removeParticipant } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const participants = getTournamentParticipants(id);
  return NextResponse.json({ participants });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { userId, participating } = data;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId richiesto' }, { status: 400 });
    }

    if (participating) {
      const tournament = getTournamentById(id);
      if (tournament) {
        const participants = getTournamentParticipants(id);
        const currentCount = participants.filter(p => p.participating).length;
        const maxPlayers = tournament.max_players ?? 16;
        if (currentCount >= maxPlayers) {
          return NextResponse.json({
            success: false,
            error: `Numero massimo di partecipanti raggiunto (${maxPlayers}).`,
          }, { status: 400 });
        }
      }
    }

    setParticipating(id, userId, participating);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set participant error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId richiesto' }, { status: 400 });
    }

    removeParticipant(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove participant error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
