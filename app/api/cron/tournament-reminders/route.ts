import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/db';
import { getTournamentParticipants } from '@/lib/db/queries';
import { sendPushToUser, recordNotificationSent, isPushConfigured } from '@/lib/notifications/push';
import type { Tournament } from '@/lib/types';

function parseStartMs(t: Tournament): number {
  const time = (t.time && t.time.trim()) || '09:00';
  const [hh, mm] = time.split(':').map((x) => parseInt(x, 10));
  const d = new Date(`${t.date}T${String(hh ?? 9).padStart(2, '0')}:${String(mm ?? 0).padStart(2, '0')}:00`);
  return d.getTime();
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_vapid' });
  }

  const db = getDb();
  const tournaments = db
    .prepare(`SELECT * FROM tournaments WHERE status IN ('open', 'in_progress') AND date >= date('now', '-1 day')`)
    .all() as Tournament[];

  const now = Date.now();
  let sent = 0;

  for (const t of tournaments) {
    const start = parseStartMs(t);
    const delta = start - now;
    const hours = delta / 3600000;

    let kind: 'reminder_24h' | 'reminder_2h' | null = null;
    // Promemoria ~24h e ~2h prima dell'inizio (finestre da cron oraria)
    if (hours > 23 && hours <= 25) kind = 'reminder_24h';
    else if (hours > 1 && hours <= 3) kind = 'reminder_2h';

    if (!kind) continue;

    const participants = getTournamentParticipants(t.id);
    for (const p of participants) {
      const uid = p.user_id;
      if (!recordNotificationSent(kind, t.id, uid)) continue;

      const label = kind === 'reminder_24h' ? 'Tra circa 24 ore' : 'Tra circa 2 ore';
      await sendPushToUser(uid, {
        title: t.name,
        body: `${label}: ${t.date}${t.time ? ` ore ${t.time}` : ''}${t.venue ? ` — ${t.venue}` : ''}`,
        url: `/tournaments/${t.id}`,
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, tournaments: tournaments.length, notifications: sent });
}
