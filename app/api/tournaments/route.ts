import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournaments, createTournament } from '@/lib/db/queries';

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
    const data = await request.json();
    const { name, date, time, venue } = data;

    if (!name || !date) {
      return NextResponse.json({ success: false, error: 'Nome e data richiesti' }, { status: 400 });
    }

    const id = createTournament({
      name,
      date,
      time: time || undefined,
      venue: venue || undefined,
      created_by: user.id,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Create tournament error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
