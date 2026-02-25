import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { resetLoginAttempts } from '@/lib/db/queries';

export async function POST(request: Request) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const { ip, username } = await request.json();
    if (!ip || typeof ip !== 'string' || !username || typeof username !== 'string') {
      return NextResponse.json({ error: 'IP e username richiesti' }, { status: 400 });
    }

    const ok = resetLoginAttempts(ip.trim(), username.trim());
    if (!ok) {
      return NextResponse.json({ error: 'Combinazione IP/username non trovata o non bloccata' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  }
}
