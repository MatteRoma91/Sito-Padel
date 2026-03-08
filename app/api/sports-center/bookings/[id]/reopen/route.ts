import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getBookingById,
  getMatchByBookingId,
  deleteMatchByBookingId,
} from '@/lib/db/queries';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { id } = await params;
  const booking = getBookingById(id);
  if (!booking || booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
  }

  const isAdmin = user.role === 'admin';
  const isOwner = booking.booked_by_user_id === user.id || booking.created_by === user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: 'Solo il proprietario della prenotazione o un admin possono riaprire la partita' },
      { status: 403 }
    );
  }

  const match = getMatchByBookingId(id);
  if (!match) {
    return NextResponse.json(
      { error: 'Nessuna partita da riaprire' },
      { status: 400 }
    );
  }

  deleteMatchByBookingId(id);
  return NextResponse.json({ ok: true });
}
