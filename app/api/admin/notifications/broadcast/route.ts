import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendPushToAllPlayers, isPushConfigured } from '@/lib/notifications/push';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push non configurato (VAPID)' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const msg = typeof body?.body === 'string' ? body.body.trim() : '';
  const url = typeof body?.url === 'string' ? body.url.trim() : '/';
  if (!title || !msg) {
    return NextResponse.json({ error: 'title e body obbligatori' }, { status: 400 });
  }

  await sendPushToAllPlayers({ title, body: msg, url: url || '/' });

  return NextResponse.json({ ok: true });
}
