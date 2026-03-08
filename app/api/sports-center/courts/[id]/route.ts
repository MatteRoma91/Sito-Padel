import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  getCourtById,
  updateCourt,
  deleteCourtById,
  hasActiveBookings,
  getCourtsOrdered,
} from '@/lib/db/queries';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Solo gli admin possono modificare i campi' }, { status: 403 });
  }

  const { id } = await params;
  const court = getCourtById(id);
  if (!court) {
    return NextResponse.json({ error: 'Campo non trovato' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, type, display_order } = body;
    const updates: { name?: string; type?: 'indoor' | 'outdoor'; display_order?: number } = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Nome non valido' }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (type !== undefined) {
      if (type !== 'indoor' && type !== 'outdoor') {
        return NextResponse.json({ error: 'Tipo deve essere indoor o outdoor' }, { status: 400 });
      }
      updates.type = type;
    }
    if (display_order !== undefined) {
      const order = Number(display_order);
      if (Number.isNaN(order) || order < 0) {
        return NextResponse.json({ error: 'Ordine non valido' }, { status: 400 });
      }
      updates.display_order = order;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
    }
    updateCourt(id, updates);
    const updated = getCourtById(id);
    return NextResponse.json({ success: true, court: updated });
  } catch (err) {
    console.error('Update court error:', err);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Solo gli admin possono eliminare i campi' }, { status: 403 });
  }

  const { id } = await params;
  const court = getCourtById(id);
  if (!court) {
    return NextResponse.json({ error: 'Campo non trovato' }, { status: 404 });
  }

  if (hasActiveBookings(id)) {
    return NextResponse.json(
      { error: 'Impossibile eliminare: esistono prenotazioni confermate per questo campo' },
      { status: 400 }
    );
  }

  deleteCourtById(id);
  const courts = getCourtsOrdered();
  return NextResponse.json({ success: true, courts });
}
