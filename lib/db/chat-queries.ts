import { randomUUID } from 'crypto';
import { getDb } from './db';
import { ensureDb } from './queries';

const MAX_MESSAGE_LENGTH = 2000;

export interface ChatConversation {
  id: string;
  type: 'dm' | 'tournament' | 'broadcast' | 'group';
  tournament_id: string | null;
  created_at: string;
}

export interface ChatParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

function sanitizeBody(body: string): string {
  return body.trim().slice(0, MAX_MESSAGE_LENGTH);
}

/** Get or create DM conversation between two users (order-independent) */
export function getOrCreateDmConversation(userId1: string, userId2: string): ChatConversation {
  ensureDb();
  const db = getDb();
  const [u1, u2] = [userId1, userId2].sort();
  // Look for existing DM: 2 participants, type dm, no tournament
  const existing = db.prepare(`
    SELECT c.id, c.type, c.tournament_id, c.created_at
    FROM chat_conversations c
    JOIN chat_participants p1 ON p1.conversation_id = c.id AND p1.user_id = ?
    JOIN chat_participants p2 ON p2.conversation_id = c.id AND p2.user_id = ?
    WHERE c.type = 'dm' AND c.tournament_id IS NULL
  `).get(u1, u2) as ChatConversation | undefined;

  if (existing) return existing;

  const id = randomUUID();
  db.prepare(`INSERT INTO chat_conversations (id, type, tournament_id) VALUES (?, 'dm', NULL)`).run(id);
  db.prepare(`INSERT INTO chat_participants (conversation_id, user_id) VALUES (?, ?)`).run(id, u1);
  db.prepare(`INSERT INTO chat_participants (conversation_id, user_id) VALUES (?, ?)`).run(id, u2);

  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(id) as ChatConversation;
  return conv;
}

/** Get or create group conversation (current user + selected users); exact participant match */
export function getOrCreateGroupConversation(currentUserId: string, otherUserIds: string[]): ChatConversation {
  ensureDb();
  const db = getDb();
  const allIds = [currentUserId, ...otherUserIds].filter((id, i, arr) => arr.indexOf(id) === i).sort();
  if (allIds.length < 2) throw new Error('Almeno 2 partecipanti richiesti');

  // Find existing group with same participants
  const existingGroups = db.prepare(`
    SELECT c.id FROM chat_conversations c
    WHERE c.type = 'group' AND c.tournament_id IS NULL
  `).all() as { id: string }[];
  for (const row of existingGroups) {
    const participants = getParticipantIds(row.id).sort();
    if (participants.length === allIds.length && participants.every((p, i) => p === allIds[i])) {
      return getConversationById(row.id)!;
    }
  }

  const id = randomUUID();
  db.prepare("INSERT INTO chat_conversations (id, type, tournament_id) VALUES (?, 'group', NULL)").run(id);
  const insertParticipant = db.prepare('INSERT OR IGNORE INTO chat_participants (conversation_id, user_id) VALUES (?, ?)');
  for (const uid of allIds) insertParticipant.run(id, uid);
  return getConversationById(id)!;
}

/** Get or create tournament group conversation; participants = tournament_participants with participating=1 */
export function getOrCreateTournamentConversation(tournamentId: string): ChatConversation {
  ensureDb();
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM chat_conversations WHERE type = ? AND tournament_id = ?'
  ).get('tournament', tournamentId) as ChatConversation | undefined;

  if (existing) {
    return existing;
  }

  const id = randomUUID();
  db.prepare(
    'INSERT INTO chat_conversations (id, type, tournament_id) VALUES (?, ?, ?)'
  ).run(id, 'tournament', tournamentId);

  const participantIds = db.prepare(
    'SELECT user_id FROM tournament_participants WHERE tournament_id = ? AND participating = 1'
  ).all(tournamentId) as { user_id: string }[];

  const insertParticipant = db.prepare(
    'INSERT OR IGNORE INTO chat_participants (conversation_id, user_id) VALUES (?, ?)'
  );
  for (const { user_id } of participantIds) {
    insertParticipant.run(id, user_id);
  }

  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(id) as ChatConversation;
  return conv;
}

/** Get or create broadcast conversation (tutti gli utenti) */
export function getOrCreateBroadcastConversation(): ChatConversation {
  ensureDb();
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM chat_conversations WHERE type = 'broadcast' LIMIT 1"
  ).get() as ChatConversation | undefined;

  if (existing) return existing;

  const id = randomUUID();
  db.prepare(
    "INSERT INTO chat_conversations (id, type, tournament_id) VALUES (?, 'broadcast', NULL)"
  ).run(id);

  const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(id) as ChatConversation;
  return conv;
}

/** Ensure user is participant of tournament conversation (e.g. joined tournament after conv creation) */
export function ensureTournamentParticipant(conversationId: string, userId: string): void {
  ensureDb();
  const conv = getConversationById(conversationId);
  if (!conv || conv.type !== 'tournament' || !conv.tournament_id) return;
  const db = getDb();
  const inTournament = db.prepare(
    'SELECT 1 FROM tournament_participants WHERE tournament_id = ? AND user_id = ? AND participating = 1'
  ).get(conv.tournament_id, userId);
  if (inTournament) {
    db.prepare('INSERT OR IGNORE INTO chat_participants (conversation_id, user_id) VALUES (?, ?)').run(conversationId, userId);
  }
}

/** Get conversation by ID */
export function getConversationById(conversationId: string): ChatConversation | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM chat_conversations WHERE id = ?').get(conversationId) as ChatConversation | undefined;
}

/** Get participant user IDs for a conversation */
export function getParticipantIds(conversationId: string): string[] {
  ensureDb();
  const conv = getConversationById(conversationId);
  if (conv?.type === 'broadcast') {
    const rows = getDb().prepare('SELECT id FROM users').all() as { id: string }[];
    return rows.map(r => r.id);
  }
  const rows = getDb().prepare('SELECT user_id FROM chat_participants WHERE conversation_id = ?').all(conversationId) as { user_id: string }[];
  return rows.map(r => r.user_id);
}

/** Check if user is participant of conversation */
export function isParticipant(conversationId: string, userId: string): boolean {
  ensureDb();
  const conv = getConversationById(conversationId);
  if (conv?.type === 'broadcast') {
    const row = getDb().prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
    return !!row;
  }
  const row = getDb().prepare(
    'SELECT 1 FROM chat_participants WHERE conversation_id = ? AND user_id = ?'
  ).get(conversationId, userId);
  return !!row;
}

/** Get conversations for a user (DM + tournaments + broadcast) */
export function getConversationsForUser(userId: string): Array<ChatConversation & { last_message_at?: string }> {
  ensureDb();
  const db = getDb();
  const convs = db.prepare(`
    SELECT c.id, c.type, c.tournament_id, c.created_at
    FROM chat_conversations c
    JOIN chat_participants p ON p.conversation_id = c.id AND p.user_id = ?
    ORDER BY c.created_at DESC
  `).all(userId) as ChatConversation[];

  const broadcast = db.prepare("SELECT * FROM chat_conversations WHERE type = 'broadcast' LIMIT 1").get() as (ChatConversation & { last_message_at?: string }) | undefined;
  if (broadcast) {
    const lastMsg = db.prepare(
      'SELECT created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(broadcast.id) as { created_at: string } | undefined;
    broadcast.last_message_at = lastMsg?.created_at;
  }

  const result: Array<ChatConversation & { last_message_at?: string }> = broadcast ? [broadcast] : [];
  for (const c of convs) {
    if (c.type === 'broadcast') continue;
    const lastMsg = db.prepare(
      'SELECT created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(c.id) as { created_at: string } | undefined;
    result.push({
      ...c,
      last_message_at: lastMsg?.created_at,
    });
  }
  result.sort((a, b) => {
    const ta = a.last_message_at || a.created_at;
    const tb = b.last_message_at || b.created_at;
    return tb.localeCompare(ta);
  });
  return result;
}

/** Get all conversations for admin (no participant filter) */
export function getAllConversationsForAdmin(): Array<ChatConversation & { last_message_at?: string }> {
  ensureDb();
  const db = getDb();
  const convs = db.prepare(
    'SELECT * FROM chat_conversations ORDER BY created_at DESC'
  ).all() as ChatConversation[];

  const result: Array<ChatConversation & { last_message_at?: string }> = [];
  for (const c of convs) {
    const lastMsg = db.prepare(
      'SELECT created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(c.id) as { created_at: string } | undefined;
    result.push({
      ...c,
      last_message_at: lastMsg?.created_at,
    });
  }
  result.sort((a, b) => {
    const ta = a.last_message_at || a.created_at;
    const tb = b.last_message_at || b.created_at;
    return tb.localeCompare(ta);
  });
  return result;
}

/** Get unread message count for a user across all their conversations */
export function getUnreadCountForUser(userId: string): number {
  ensureDb();
  const db = getDb();
  const convs = getConversationsForUser(userId);
  let total = 0;
  for (const c of convs) {
    const lastRead = db.prepare(
      'SELECT last_read_at FROM chat_last_read WHERE user_id = ? AND conversation_id = ?'
    ).get(userId, c.id) as { last_read_at: string } | undefined;
    const since = lastRead?.last_read_at ?? '1970-01-01T00:00:00.000Z';
    const row = db.prepare(
      'SELECT COUNT(*) as n FROM chat_messages WHERE conversation_id = ? AND created_at > ? AND sender_id != ?'
    ).get(c.id, since, userId) as { n: number };
    total += row.n;
  }
  return total;
}

/** Mark conversation as read for user (updates last_read_at to latest message) */
export function markConversationAsRead(conversationId: string, userId: string): void {
  ensureDb();
  if (!isParticipant(conversationId, userId)) return;
  const db = getDb();
  const lastMsg = db.prepare(
    'SELECT created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(conversationId) as { created_at: string } | undefined;
  const ts = lastMsg?.created_at ?? new Date().toISOString();
  db.prepare(
    'INSERT INTO chat_last_read (user_id, conversation_id, last_read_at) VALUES (?, ?, ?) ON CONFLICT(user_id, conversation_id) DO UPDATE SET last_read_at = excluded.last_read_at'
  ).run(userId, conversationId, ts);
}

/** Delete conversation (admin only); cascade deletes participants and messages */
export function deleteConversation(conversationId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM chat_conversations WHERE id = ?').run(conversationId);
}

/** Get messages for a conversation (paginated, newest first) */
export function getMessages(
  conversationId: string,
  limit: number = 50,
  before?: string
): ChatMessage[] {
  ensureDb();
  const db = getDb();
  if (before) {
    return db.prepare(`
      SELECT * FROM chat_messages
      WHERE conversation_id = ? AND created_at < ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(conversationId, before, limit) as ChatMessage[];
  }
  return db.prepare(`
    SELECT * FROM chat_messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(conversationId, limit) as ChatMessage[];
}

/** Insert a message; returns the created message. Validates participant. */
export function insertMessage(
  conversationId: string,
  senderId: string,
  body: string
): ChatMessage {
  ensureDb();
  if (!isParticipant(conversationId, senderId)) {
    throw new Error('User is not a participant of this conversation');
  }
  const sanitized = sanitizeBody(body);
  if (!sanitized) {
    throw new Error('Message body cannot be empty');
  }

  const id = randomUUID();
  const db = getDb();
  db.prepare(`
    INSERT INTO chat_messages (id, conversation_id, sender_id, body)
    VALUES (?, ?, ?, ?)
  `).run(id, conversationId, senderId, sanitized);

  return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id) as ChatMessage;
}
