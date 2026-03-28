import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db/db';
import { isPushConfigured } from '@/lib/notifications/push';

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push non configurato sul server (VAPID)' }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sub = body?.subscription ?? body;
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : '';
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : '';
  const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : '';
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Subscription non valida' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  const id = randomUUID();
  db.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, user.id, endpoint, p256dh, auth, request.headers.get('user-agent') || null);

  return NextResponse.json({ ok: true });
}
