import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentById, updateTournament, deleteTournament } from '@/lib/db/queries';
import type { TournamentStatus, TournamentCategory } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const tournament = getTournamentById(id);
  if (!tournament) {
    return NextResponse.json({ error: 'Torneo non trovato' }, { status: 404 });
  }

  return NextResponse.json({ tournament });
}

export async function PATCH(
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
    const { name, date, time, venue, status, category } = data;

    const updates: { name?: string; date?: string; time?: string; venue?: string; status?: TournamentStatus; category?: TournamentCategory } = {};
    if (name !== undefined) updates.name = name;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (venue !== undefined) updates.venue = venue;
    if (status !== undefined) updates.status = status as TournamentStatus;
    if (category !== undefined) updates.category = category === 'grand_slam' ? 'grand_slam' : 'master_1000';

    if (Object.keys(updates).length > 0) {
      updateTournament(id, updates);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update tournament error:', error);
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
    deleteTournament(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tournament error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
