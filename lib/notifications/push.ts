import webpush from 'web-push';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db/db';

const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || '';
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || '';
const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:banana-padel@localhost';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function isPushConfigured(): boolean {
  return Boolean(publicKey && privateKey);
}

export function getVapidPublicKey(): string {
  return publicKey;
}

export type PushPayload = { title: string; body: string; url?: string };

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  const db = getDb();
  const subs = db
    .prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?')
    .all(userId) as Array<{ endpoint: string; p256dh: string; auth: string }>;
  const body = JSON.stringify(payload);
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
        { TTL: 3600 }
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(s.endpoint);
      }
    }
  }
}

/** Tutti gli utenti con ruolo player (ed eventualmente admin) — per nuovo torneo / iscrizioni aperte */
export async function sendPushToAllPlayers(payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  const db = getDb();
  const users = db.prepare("SELECT id FROM users WHERE role IN ('player', 'admin')").all() as { id: string }[];
  for (const u of users) {
    await sendPushToUser(u.id, payload);
  }
}

export async function sendPushToTournamentParticipants(tournamentId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  const db = getDb();
  const rows = db
    .prepare('SELECT DISTINCT user_id FROM tournament_participants WHERE tournament_id = ?')
    .all(tournamentId) as { user_id: string }[];
  for (const r of rows) {
    await sendPushToUser(r.user_id, payload);
  }
}

export function recordNotificationSent(kind: string, refId: string, userId: string | null): boolean {
  const db = getDb();
  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO notification_sent (id, kind, ref_id, user_id) VALUES (?, ?, ?, ?)`
    ).run(id, kind, refId, userId);
    return true;
  } catch {
    return false;
  }
}
