import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getAllClosedSlots, insertClosedSlot, deleteClosedSlot } from '@/lib/db/queries';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Solo gli admin possono gestire gli slot di chiusura' }, { status: 403 });
  }

  const slots = getAllClosedSlots();
  return NextResponse.json({ slots });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Solo gli admin possono gestire gli slot di chiusura' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, id, day_of_week, slot_start, slot_end } = body;

    if (action === 'delete' && id) {
      deleteClosedSlot(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'add' && typeof day_of_week === 'number' && slot_start && slot_end) {
      if (day_of_week < 0 || day_of_week > 6) {
        return NextResponse.json({ error: 'day_of_week deve essere 0-6 (0=domenica)' }, { status: 400 });
      }
      const id = insertClosedSlot({
        day_of_week,
        slot_start: String(slot_start),
        slot_end: String(slot_end),
      });
      const slots = getAllClosedSlots();
      return NextResponse.json({ success: true, id, slots });
    }

    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  } catch (err) {
    console.error('Closed slots error:', err);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
