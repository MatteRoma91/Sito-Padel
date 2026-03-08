import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getCourtsOrdered, insertCourt } from '@/lib/db/queries';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const courts = getCourtsOrdered();
  return NextResponse.json({ courts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Solo gli admin possono creare campi' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, type, display_order } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nome campo obbligatorio' }, { status: 400 });
    }
    if (type !== 'indoor' && type !== 'outdoor') {
      return NextResponse.json({ error: 'Tipo deve essere indoor o outdoor' }, { status: 400 });
    }
    const order = typeof display_order === 'number' ? display_order : Number(display_order);
    if (Number.isNaN(order) || order < 0) {
      return NextResponse.json({ error: 'Ordine di visualizzazione non valido' }, { status: 400 });
    }
    const id = insertCourt({ name: name.trim(), type, display_order: order });
    const courts = getCourtsOrdered();
    const court = courts.find((c) => c.id === id);
    return NextResponse.json({ success: true, id, court });
  } catch (err) {
    console.error('Create court error:', err);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
