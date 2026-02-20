import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournaments, createTournament } from '@/lib/db/queries';
import { createTournamentSchema, parseOrThrow, ValidationError } from '@/lib/validations';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const tournaments = getTournaments();
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Solo gli admin possono creare tornei' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = parseOrThrow(createTournamentSchema, body);
    const { name, date, time, venue, category, maxPlayers } = data;

    const validCategory = category === 'grand_slam' ? 'grand_slam' : 'master_1000';
    const validMaxPlayers = maxPlayers === 8 ? 8 : 16;

    const id = createTournament({
      name,
      date,
      time: time ?? undefined,
      venue: venue ?? undefined,
      category: validMaxPlayers === 8 ? 'brocco_500' : validCategory,
      max_players: validMaxPlayers,
      created_by: user.id,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Create tournament error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
