import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getTournamentById,
  getTournamentParticipants,
  setParticipating,
  removeParticipant,
  getPairs,
  getMatches,
} from '@/lib/db/queries';
import { parseOrThrow, ValidationError } from '@/lib/validations';

const postBodySchema = z.object({
  userId: z.string().uuid(),
  participating: z.boolean(),
});

function countParticipating(tournamentId: string): number {
  return getTournamentParticipants(tournamentId).filter((p) => p.participating).length;
}

function rosterLocked(tournamentId: string): boolean {
  return getPairs(tournamentId).length > 0 || getMatches(tournamentId).length > 0;
}

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
  if (!canEdit(user)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
  }

  try {
    const raw = await request.json();
    const { userId, participating } = parseOrThrow(postBodySchema, raw);

    const tournament = getTournamentById(id);
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
    }

    if (rosterLocked(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Impossibile modificare i partecipanti: sono già presenti coppie o partite.',
        },
        { status: 409 }
      );
    }

    const isAdmin = user.role === 'admin';
    const isSelf = userId === user.id;

    if (!isAdmin) {
      if (!isSelf) {
        return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
      }
      if (tournament.status !== 'open') {
        return NextResponse.json(
          { success: false, error: 'Iscrizione consentita solo con iscrizioni aperte.' },
          { status: 403 }
        );
      }
    }

    if (participating) {
      const currentCount = countParticipating(id);
      const maxPlayers = tournament.max_players ?? 16;
      if (currentCount >= maxPlayers) {
        return NextResponse.json(
          {
            success: false,
            error: `Numero massimo di partecipanti raggiunto (${maxPlayers}).`,
          },
          { status: 400 }
        );
      }
    }

    setParticipating(id, userId, participating);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
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
  if (!canEdit(user)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId richiesto' }, { status: 400 });
    }

    const tournament = getTournamentById(id);
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Torneo non trovato' }, { status: 404 });
    }

    if (rosterLocked(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Impossibile modificare i partecipanti: sono già presenti coppie o partite.',
        },
        { status: 409 }
      );
    }

    const isAdmin = user.role === 'admin';
    const isSelf = userId === user.id;

    if (!isAdmin) {
      if (!isSelf) {
        return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
      }
      if (tournament.status !== 'open') {
        return NextResponse.json(
          { success: false, error: 'Disiscrizione consentita solo con iscrizioni aperte.' },
          { status: 403 }
        );
      }
    }

    removeParticipant(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove participant error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
