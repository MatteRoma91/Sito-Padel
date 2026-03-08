import { cache } from 'react';
import { getDb } from './db';
import { initSchema } from './schema';
import { seed } from './seed';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../constants';
import type { User, Tournament, TournamentParticipant, Pair, Match, TournamentRanking, CumulativeRanking, SkillLevel, TournamentCategory, Court, CourtBooking, CourtBookingParticipant, CenterClosedSlot, CourtBookingMatch } from '../types';
import { overallScoreToLevel, overallLevelToSkillLevel, MATCH_WIN_DELTA, MATCH_LOSS_DELTA, TOURNAMENT_WIN_DELTA, TOURNAMENT_LAST_DELTA, TOURNAMENT_WIN_DELTA_8, TOURNAMENT_LAST_DELTA_8, TOURNAMENT_LAST_POSITION_8 } from '../types';
import { DEFAULT_SITE_CONFIG } from './site-config-defaults';

let initialized = false;

export function ensureDb() {
  if (!initialized) {
    initSchema();
    seed();
    initialized = true;
  }
}

// ============ USERS ============

export function getUsers(): User[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM users ORDER BY full_name').all() as User[];
}

export function getUserById(id: string): User | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
}

export function getUsersByIds(ids: string[]): User[] {
  ensureDb();
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  return getDb().prepare(`SELECT * FROM users WHERE id IN (${placeholders})`).all(...ids) as User[];
}

const DEFAULT_PASSWORD = 'Padel123';

export function createUser(data: { username: string; password?: string; full_name?: string; nickname?: string; role?: string; mustChangePassword?: boolean }): string {
  ensureDb();
  const id = randomUUID();
  const password = data.password || DEFAULT_PASSWORD;
  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  // New users must change password unless explicitly set to false (e.g., admin creating themselves)
  const mustChange = data.mustChangePassword !== undefined ? (data.mustChangePassword ? 1 : 0) : 1;
  getDb().prepare(
    `INSERT INTO users (id, username, password_hash, full_name, nickname, role, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.username, passwordHash, data.full_name || null, data.nickname || null, data.role || 'player', mustChange);
  return id;
}

export function updateUser(id: string, data: Partial<Pick<User, 'full_name' | 'nickname' | 'role' | 'skill_level' | 'overall_score' | 'bio' | 'preferred_side' | 'preferred_hand' | 'birth_date' | 'is_hidden'>>): void {
  ensureDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.full_name !== undefined) { fields.push('full_name = ?'); values.push(data.full_name); }
  if (data.nickname !== undefined) { fields.push('nickname = ?'); values.push(data.nickname); }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
  if (data.skill_level !== undefined) { fields.push('skill_level = ?'); values.push(data.skill_level); }
  if (data.overall_score !== undefined) {
    const score = data.overall_score === null ? null : Math.max(0, Math.min(100, data.overall_score));
    fields.push('overall_score = ?');
    values.push(score);
    const level = overallScoreToLevel(score ?? 50);
    const skill = overallLevelToSkillLevel(level);
    fields.push('skill_level = ?');
    values.push(skill);
  }
  if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }
  if (data.preferred_side !== undefined) { fields.push('preferred_side = ?'); values.push(data.preferred_side); }
  if (data.preferred_hand !== undefined) { fields.push('preferred_hand = ?'); values.push(data.preferred_hand); }
  if (data.birth_date !== undefined) { fields.push('birth_date = ?'); values.push(data.birth_date); }
  if (data.is_hidden !== undefined) { fields.push('is_hidden = ?'); values.push(data.is_hidden ? 1 : 0); }
  if (fields.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function updateUserPassword(id: string, newPassword: string, clearMustChange: boolean = false): void {
  ensureDb();
  const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  if (clearMustChange) {
    getDb().prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(passwordHash, id);
  } else {
    getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  }
}

export function setMustChangePassword(id: string, mustChange: boolean): void {
  ensureDb();
  getDb().prepare('UPDATE users SET must_change_password = ? WHERE id = ?').run(mustChange ? 1 : 0, id);
}

const RESET_PASSWORD = 'abc123';

export function resetUserPassword(userId: string, newPassword?: string): void {
  ensureDb();
  const pwd = (newPassword?.trim() || '').length > 0 ? newPassword!.trim() : RESET_PASSWORD;
  const passwordHash = bcrypt.hashSync(pwd, BCRYPT_ROUNDS);
  getDb().prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(passwordHash, userId);
}

export function updateUserAvatar(id: string, avatarPath: string | null): void {
  ensureDb();
  getDb().prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarPath, id);
}

export function updateUserSkillLevel(id: string, skillLevel: SkillLevel | null): void {
  ensureDb();
  getDb().prepare('UPDATE users SET skill_level = ? WHERE id = ?').run(skillLevel, id);
}

/** Applica i risultati del torneo al punteggio overall. 16 giocatori: partita +1/-1, 1° +2, 8° -2. 8 giocatori: partita +1/-1, 1° +3, 4° (ultimo) -3. */
export function applyTournamentResultToOverall(tournamentId: string): void {
  ensureDb();
  const tournament = getTournamentById(tournamentId);
  const is8Player = tournament?.max_players === 8;

  const pairs = getPairs(tournamentId);
  const matches = getMatches(tournamentId).filter(m => m.winner_pair_id != null);
  const rankings = getTournamentRankings(tournamentId);

  const pairIdToPosition = new Map(rankings.map(r => [r.pair_id, r.position]));
  const pairIdToPair = new Map(pairs.map(p => [p.id, p]));

  const userIdToWins = new Map<string, number>();
  const userIdToLosses = new Map<string, number>();
  const userIdToPosition = new Map<string, number>();

  for (const pair of pairs) {
    const pos = pairIdToPosition.get(pair.id);
    if (pos != null) {
      userIdToPosition.set(pair.player1_id, pos);
      userIdToPosition.set(pair.player2_id, pos);
    }
    userIdToWins.set(pair.player1_id, 0);
    userIdToWins.set(pair.player2_id, 0);
    userIdToLosses.set(pair.player1_id, 0);
    userIdToLosses.set(pair.player2_id, 0);
  }

  for (const m of matches) {
    const winnerId = m.winner_pair_id!;
    const loserId = m.pair1_id === winnerId ? m.pair2_id : m.pair1_id;
    if (!loserId) continue;
    const winnerPair = pairIdToPair.get(winnerId);
    const loserPair = pairIdToPair.get(loserId);
    if (winnerPair) {
      userIdToWins.set(winnerPair.player1_id, (userIdToWins.get(winnerPair.player1_id) ?? 0) + 1);
      userIdToWins.set(winnerPair.player2_id, (userIdToWins.get(winnerPair.player2_id) ?? 0) + 1);
    }
    if (loserPair) {
      userIdToLosses.set(loserPair.player1_id, (userIdToLosses.get(loserPair.player1_id) ?? 0) + 1);
      userIdToLosses.set(loserPair.player2_id, (userIdToLosses.get(loserPair.player2_id) ?? 0) + 1);
    }
  }

  const posWinDelta = is8Player ? TOURNAMENT_WIN_DELTA_8 : TOURNAMENT_WIN_DELTA;
  const lastPos = is8Player ? TOURNAMENT_LAST_POSITION_8 : 8;
  const lastDelta = is8Player ? TOURNAMENT_LAST_DELTA_8 : TOURNAMENT_LAST_DELTA;

  for (const pair of pairs) {
    for (const userId of [pair.player1_id, pair.player2_id]) {
      const wins = userIdToWins.get(userId) ?? 0;
      const losses = userIdToLosses.get(userId) ?? 0;
      const position = userIdToPosition.get(userId);
      let delta = wins * MATCH_WIN_DELTA + losses * MATCH_LOSS_DELTA;
      if (position === 1) delta += posWinDelta;
      if (position === lastPos) delta += lastDelta;

      const user = getUserById(userId);
      const current = user?.overall_score != null ? user.overall_score : 50;
      const newScore = Math.max(0, Math.min(100, current + delta));
      updateUser(userId, { overall_score: newScore });
    }
  }
}

const OVERALL_SCORE_SEED: { name: string; score: number }[] = [
  { name: 'Faber', score: 90 }, { name: 'David', score: 90 }, { name: 'Cora', score: 86 }, { name: 'Gerva', score: 83 },
  { name: 'Mich', score: 82 }, { name: 'Braccio', score: 76 }, { name: 'Gazzella', score: 74 }, { name: 'Merzio', score: 73 },
  { name: 'Dile', score: 72 }, { name: 'Fabio', score: 71 }, { name: 'Dibby', score: 70 }, { name: 'Scimmia', score: 69 },
  { name: 'Danti', score: 67 }, { name: 'Veca', score: 65 }, { name: 'Valerio', score: 65 }, { name: 'Ema baldi', score: 60 },
  { name: 'Porra', score: 58 }, { name: 'Fefo', score: 56 }, { name: 'Jullios', score: 54 }, { name: 'Samba', score: 48 },
  { name: 'Marco', score: 45 },
];

/** Data di inizio per i grafici: lo storico parte dal 1 gennaio 2025 e si aggiorna a ogni torneo completato. */
const CHART_START_DATE = '2025-01-01';

/** Restituisce il punteggio seed per l'utente (se in OVERALL_SCORE_SEED), altrimenti null. */
function getSeedOverallScoreForUser(userId: string): number | null {
  const user = getUserById(userId);
  if (!user) return null;
  const norm = (s: string) => (s || '').trim().toLowerCase();
  const nNick = norm(user.nickname ?? '');
  const nUser = norm(user.username ?? '');
  const nFull = norm(user.full_name ?? '');
  const entry = OVERALL_SCORE_SEED.find(
    (e) => norm(e.name) === nNick || norm(e.name) === nUser || norm(e.name) === nFull
  );
  return entry != null ? Math.max(0, Math.min(100, entry.score)) : null;
}

/** Assegna i punteggi overall dalla lista (match per nickname o username, case-insensitive). */
export function seedOverallScores(entries?: { name: string; score: number }[]): void {
  ensureDb();
  const list = entries ?? OVERALL_SCORE_SEED;
  const users = getUsers();
  const norm = (s: string) => (s || '').trim().toLowerCase();
  for (const entry of list) {
    const n = norm(entry.name);
    const user = users.find(u => norm(u.nickname ?? '') === n || norm(u.username ?? '') === n || norm(u.full_name ?? '') === n);
    if (user) {
      const clamped = Math.max(0, Math.min(100, entry.score));
      updateUser(user.id, { overall_score: clamped });
    }
  }
}

export function deleteUser(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function incrementLoginCount(userId: string): void {
  ensureDb();
  getDb().prepare('UPDATE users SET login_count = login_count + 1 WHERE id = ?').run(userId);
}

export interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
}

export function getUsersWithLoginCounts(): UserWithLoginCount[] {
  ensureDb();
  return getDb().prepare(
    'SELECT id, username, full_name, nickname, COALESCE(login_count, 0) AS login_count FROM users ORDER BY login_count DESC, full_name'
  ).all() as UserWithLoginCount[];
}

// ============ LOGIN ATTEMPTS (rate limiting) ============
// Blocco per (IP + username): sbagliare con un profilo non blocca l'accesso con altri dallo stesso IP

export interface LoginAttempt {
  ip: string;
  username: string;
  failed_count: number;
  locked_until: string;
}

export function getLoginAttempts(ip: string, username: string): LoginAttempt | undefined {
  ensureDb();
  return getDb().prepare('SELECT ip, username, failed_count, locked_until FROM login_attempts WHERE ip = ? AND username = ?').get(ip, username) as LoginAttempt | undefined;
}

export function recordLoginFailure(ip: string, username: string): void {
  ensureDb();
  const db = getDb();
  const existing = getLoginAttempts(ip, username);
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  if (existing) {
    const newCount = existing.failed_count + 1;
    const lock = newCount >= 5 ? lockedUntil : '';
    db.prepare(
      'UPDATE login_attempts SET failed_count = ?, locked_until = ? WHERE ip = ? AND username = ?'
    ).run(newCount, lock, ip, username);
  } else {
    const lock = 1 >= 5 ? lockedUntil : '';
    db.prepare(
      'INSERT INTO login_attempts (ip, username, failed_count, locked_until) VALUES (?, ?, 1, ?)'
    ).run(ip, username || 'unknown', lock);
  }
}

export function recordLoginSuccess(ip: string, username: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM login_attempts WHERE ip = ? AND username = ?').run(ip, username);
}

export function resetLoginAttempts(ip: string, username: string): boolean {
  ensureDb();
  const result = getDb().prepare('DELETE FROM login_attempts WHERE ip = ? AND username = ?').run(ip, username);
  return result.changes > 0;
}

export function getBlockedAttempts(): LoginAttempt[] {
  ensureDb();
  const now = new Date().toISOString();
  return getDb().prepare(
    'SELECT ip, username, failed_count, locked_until FROM login_attempts WHERE locked_until != "" AND locked_until > ? ORDER BY locked_until DESC'
  ).all(now) as LoginAttempt[];
}

// ============ SITE CONFIG ============

function getSiteConfigImpl(): Record<string, string> {
  ensureDb();
  const rows = getDb().prepare('SELECT key, value FROM site_config').all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const r of rows) result[r.key] = r.value;
  for (const [k, v] of Object.entries(DEFAULT_SITE_CONFIG)) {
    if (!(k in result)) result[k] = v;
  }
  return result;
}

/** Deduplicato per richiesta (generateMetadata + layout condividono il risultato). */
export const getSiteConfig = cache(getSiteConfigImpl);

export function setSiteConfig(key: string, value: string): void {
  ensureDb();
  getDb().prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)').run(key, value);
}

export function seedSiteConfig(): void {
  ensureDb();
  const stmt = getDb().prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SITE_CONFIG)) {
    stmt.run(key, value);
  }
}

// ============ SPORTS CENTER (courts, bookings, closed slots) ============

export function getCourts(): Court[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM courts').all() as Court[];
}

export function getCourtsOrdered(): Court[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM courts ORDER BY display_order, name').all() as Court[];
}

export function insertCourt(data: { name: string; type: 'indoor' | 'outdoor'; display_order: number }): string {
  ensureDb();
  const id = randomUUID();
  getDb()
    .prepare('INSERT INTO courts (id, name, type, display_order) VALUES (?, ?, ?, ?)')
    .run(id, data.name.trim(), data.type, data.display_order);
  return id;
}

export function updateCourt(id: string, data: { name?: string; type?: 'indoor' | 'outdoor'; display_order?: number }): void {
  ensureDb();
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name.trim());
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.display_order !== undefined) {
    updates.push('display_order = ?');
    values.push(data.display_order);
  }
  if (updates.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE courts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function getCourtById(id: string): Court | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM courts WHERE id = ?').get(id) as Court | undefined;
}

export function hasActiveBookings(courtId: string): boolean {
  ensureDb();
  const row = getDb()
    .prepare('SELECT 1 FROM court_bookings WHERE court_id = ? AND status = ? LIMIT 1')
    .get(courtId, 'confirmed') as { '1'?: number } | undefined;
  return !!row;
}

export function deleteCourtById(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM courts WHERE id = ?').run(id);
}

export function getBookingsByDate(date: string): CourtBooking[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_bookings WHERE date = ? AND status = ? ORDER BY slot_start')
    .all(date, 'confirmed') as CourtBooking[];
}

export function getBookingsByCourtAndDate(courtId: string, date: string): CourtBooking[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_bookings WHERE court_id = ? AND date = ? AND status = ? ORDER BY slot_start')
    .all(courtId, date, 'confirmed') as CourtBooking[];
}

export function getBookingsInDateRange(fromDate: string, toDate: string): CourtBooking[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_bookings WHERE status = ? AND date >= ? AND date <= ? ORDER BY date, slot_start')
    .all('confirmed', fromDate, toDate) as CourtBooking[];
}

export function getBookingById(id: string): CourtBooking | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM court_bookings WHERE id = ?').get(id) as CourtBooking | undefined;
}

export function createBooking(data: {
  court_id: string;
  date: string;
  slot_start: string;
  slot_end: string;
  booking_name: string;
  tournament_id?: string | null;
  booked_by_user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  created_by?: string | null;
}): string {
  ensureDb();
  const id = randomUUID();
  const name = (data.booking_name && data.booking_name.trim()) ? data.booking_name.trim() : 'Prenotazione';
  getDb()
    .prepare(
      `INSERT INTO court_bookings (id, court_id, date, slot_start, slot_end, booking_name, tournament_id, booked_by_user_id, guest_name, guest_phone, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.court_id,
      data.date,
      data.slot_start,
      data.slot_end,
      name,
      data.tournament_id ?? null,
      data.booked_by_user_id ?? null,
      data.guest_name ?? null,
      data.guest_phone ?? null,
      data.created_by ?? null
    );
  return id;
}

export function updateBooking(
  id: string,
  data: {
    booking_name?: string;
    court_id?: string;
    date?: string;
    slot_start?: string;
    slot_end?: string;
    status?: string;
  }
): void {
  ensureDb();
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (data.booking_name !== undefined) {
    updates.push('booking_name = ?');
    values.push(data.booking_name);
  }
  if (data.court_id !== undefined) {
    updates.push('court_id = ?');
    values.push(data.court_id);
  }
  if (data.date !== undefined) {
    updates.push('date = ?');
    values.push(data.date);
  }
  if (data.slot_start !== undefined) {
    updates.push('slot_start = ?');
    values.push(data.slot_start);
  }
  if (data.slot_end !== undefined) {
    updates.push('slot_end = ?');
    values.push(data.slot_end);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (updates.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE court_bookings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function cancelBooking(id: string): void {
  ensureDb();
  getDb().prepare('UPDATE court_bookings SET status = ? WHERE id = ?').run('cancelled', id);
}

export function getBookingParticipants(bookingId: string): CourtBookingParticipant[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_booking_participants WHERE booking_id = ? ORDER BY position')
    .all(bookingId) as CourtBookingParticipant[];
}

export type BookingParticipantSlot = {
  user_id?: string | null;
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_phone?: string | null;
};

export function setBookingParticipants(bookingId: string, participants: BookingParticipantSlot[]): void {
  ensureDb();
  const db = getDb();
  db.prepare('DELETE FROM court_booking_participants WHERE booking_id = ?').run(bookingId);
  const insert = db.prepare(
    `INSERT INTO court_booking_participants (id, booking_id, user_id, position, guest_first_name, guest_last_name, guest_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (let position = 1; position <= 4; position++) {
    const slot = participants[position - 1];
    if (!slot) continue;
    const userId = slot.user_id != null && String(slot.user_id).trim() ? String(slot.user_id).trim() : null;
    const gFirst = slot.guest_first_name != null && String(slot.guest_first_name).trim() ? String(slot.guest_first_name).trim() : null;
    const gLast = slot.guest_last_name != null && String(slot.guest_last_name).trim() ? String(slot.guest_last_name).trim() : null;
    const gPhone = slot.guest_phone != null && String(slot.guest_phone).trim() ? String(slot.guest_phone).trim() : null;
    if (userId) {
      insert.run(randomUUID(), bookingId, userId, position, null, null, null);
    } else if (gFirst && gLast) {
      insert.run(randomUUID(), bookingId, null, position, gFirst, gLast, gPhone);
    }
  }
}

export function getMatchByBookingId(bookingId: string): CourtBookingMatch | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM court_booking_matches WHERE booking_id = ?').get(bookingId) as CourtBookingMatch | undefined;
}

export function createMatchForBooking(bookingId: string): void {
  ensureDb();
  const existing = getMatchByBookingId(bookingId);
  if (existing) return;
  const id = randomUUID();
  getDb()
    .prepare('INSERT INTO court_booking_matches (id, booking_id, created_at) VALUES (?, ?, datetime(\'now\'))')
    .run(id, bookingId);
}

export function updateCourtBookingMatchResult(
  bookingId: string,
  data: {
    result_winner: 1 | 2;
    result_set1_c1: number;
    result_set1_c2: number;
    result_set2_c1: number;
    result_set2_c2: number;
    result_set3_c1?: number;
    result_set3_c2?: number;
  }
): void {
  ensureDb();
  const updates: string[] = [
    'result_winner = ?',
    'result_set1_c1 = ?', 'result_set1_c2 = ?',
    'result_set2_c1 = ?', 'result_set2_c2 = ?',
    'result_set3_c1 = ?', 'result_set3_c2 = ?',
    'result_entered_at = datetime(\'now\')',
  ];
  const values: (number | null)[] = [
    data.result_winner,
    data.result_set1_c1, data.result_set1_c2,
    data.result_set2_c1, data.result_set2_c2,
    data.result_set3_c1 ?? null, data.result_set3_c2 ?? null,
  ];
  getDb()
    .prepare(`UPDATE court_booking_matches SET ${updates.join(', ')} WHERE booking_id = ?`)
    .run(...values, bookingId);
}

export function deleteMatchByBookingId(bookingId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM court_booking_matches WHERE booking_id = ?').run(bookingId);
}

export function getClosedSlotsByDay(dayOfWeek: number): CenterClosedSlot[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM center_closed_slots WHERE day_of_week = ? ORDER BY slot_start')
    .all(dayOfWeek) as CenterClosedSlot[];
}

export function getAllClosedSlots(): CenterClosedSlot[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM center_closed_slots ORDER BY day_of_week, slot_start').all() as CenterClosedSlot[];
}

export function insertClosedSlot(data: { day_of_week: number; slot_start: string; slot_end: string }): string {
  ensureDb();
  const id = randomUUID();
  getDb()
    .prepare('INSERT INTO center_closed_slots (id, day_of_week, slot_start, slot_end) VALUES (?, ?, ?, ?)')
    .run(id, data.day_of_week, data.slot_start, data.slot_end);
  return id;
}

export function deleteClosedSlot(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM center_closed_slots WHERE id = ?').run(id);
}

// ============ TOURNAMENTS ============

export function getTournaments(): Tournament[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM tournaments ORDER BY date DESC').all() as Tournament[];
}

export function getTournamentById(id: string): Tournament | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Tournament | undefined;
}

export function getTournamentsFuture(): Tournament[] {
  ensureDb();
  return getDb().prepare("SELECT * FROM tournaments WHERE date >= date('now') ORDER BY date ASC").all() as Tournament[];
}

export function getTournamentsPast(): Tournament[] {
  ensureDb();
  return getDb().prepare("SELECT * FROM tournaments WHERE date < date('now') ORDER BY date DESC").all() as Tournament[];
}

export function getTournamentsPastFiltered(filters: { year?: string; month?: string; name?: string }): Tournament[] {
  ensureDb();
  let sql = "SELECT * FROM tournaments WHERE date < date('now')";
  const params: string[] = [];
  if (filters.year) {
    sql += " AND strftime('%Y', date) = ?";
    params.push(filters.year);
  }
  if (filters.month) {
    sql += " AND strftime('%m', date) = ?";
    params.push(filters.month.padStart(2, '0'));
  }
  if (filters.name) {
    sql += " AND name LIKE ?";
    params.push(`%${filters.name}%`);
  }
  sql += " ORDER BY date DESC";
  return getDb().prepare(sql).all(...params) as Tournament[];
}

export function getAllPastTournamentDates(): { date: string }[] {
  ensureDb();
  return getDb().prepare("SELECT DISTINCT date FROM tournaments WHERE date < date('now') ORDER BY date DESC").all() as { date: string }[];
}

export function createTournament(data: { name: string; date: string; time?: string; venue?: string; category?: TournamentCategory; max_players?: number; created_by: string }): string {
  ensureDb();
  const id = randomUUID();
  const maxPlayers = data.max_players === 8 ? 8 : 16;
  const category: TournamentCategory =
    maxPlayers === 8
      ? 'brocco_500'
      : data.category === 'grand_slam'
        ? 'grand_slam'
        : 'master_1000';

  getDb().prepare(
    `INSERT INTO tournaments (id, name, date, time, venue, category, max_players, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.name, data.date, data.time || null, data.venue || null, category, maxPlayers, data.created_by);
  return id;
}

export function createTournamentWithCourtBookings(data: {
  name: string;
  date: string;
  time?: string;
  venue?: string;
  category?: TournamentCategory;
  max_players?: number;
  created_by: string;
  slot_start: string;
  slot_end: string;
  court_ids: string[];
}): string {
  ensureDb();
  const db = getDb();
  const maxPlayers = data.max_players === 8 ? 8 : 16;
  const category: TournamentCategory =
    maxPlayers === 8
      ? 'brocco_500'
      : data.category === 'grand_slam'
        ? 'grand_slam'
        : 'master_1000';

  const tournamentId = randomUUID();
  const name = (data.name && data.name.trim()) ? data.name.trim() : 'Torneo';

  db.transaction(() => {
    db.prepare(
      `INSERT INTO tournaments (id, name, date, time, venue, category, max_players, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(tournamentId, name, data.date, data.time || null, data.venue || null, category, maxPlayers, data.created_by);

    const insertBooking = db.prepare(
      `INSERT INTO court_bookings (id, court_id, date, slot_start, slot_end, booking_name, tournament_id, booked_by_user_id, guest_name, guest_phone, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const court_id of data.court_ids) {
      if (!court_id || !court_id.trim()) continue;
      insertBooking.run(
        randomUUID(),
        court_id.trim(),
        data.date,
        data.slot_start,
        data.slot_end,
        name,
        tournamentId,
        null,
        null,
        null,
        data.created_by
      );
    }
  })();

  return tournamentId;
}

export function updateTournament(id: string, data: Partial<Pick<Tournament, 'name' | 'date' | 'time' | 'venue' | 'status' | 'category' | 'max_players' | 'completed_at' | 'mvp_deadline'>>): void {
  ensureDb();
  const existing = getTournamentById(id);

  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.time !== undefined) { fields.push('time = ?'); values.push(data.time); }
  if (data.venue !== undefined) { fields.push('venue = ?'); values.push(data.venue); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(data.completed_at); }
  if (data.mvp_deadline !== undefined) { fields.push('mvp_deadline = ?'); values.push(data.mvp_deadline); }

  // Calcola il nuovo max_players (se fornito) o quello esistente
  const effectiveMaxPlayers = data.max_players !== undefined
    ? (data.max_players === 8 ? 8 : 16)
    : (existing?.max_players ?? 16);

  // Gestione categoria: forzata a brocco_500 per tornei da 8 giocatori
  if (data.category !== undefined || effectiveMaxPlayers === 8) {
    const newCategory: TournamentCategory =
      effectiveMaxPlayers === 8
        ? 'brocco_500'
        : data.category === 'grand_slam'
          ? 'grand_slam'
          : (data.category === 'master_1000' ? 'master_1000' : (existing?.category ?? 'master_1000'));

    fields.push('category = ?');
    values.push(newCategory);
  }

  if (data.max_players !== undefined) {
    fields.push('max_players = ?');
    values.push(String(effectiveMaxPlayers));
  }

  if (fields.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE tournaments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteTournament(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM tournaments WHERE id = ?').run(id);
}

// ============ PARTICIPANTS ============

export function getTournamentParticipants(tournamentId: string): TournamentParticipant[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM tournament_participants WHERE tournament_id = ?').all(tournamentId) as TournamentParticipant[];
}

export function getTournamentParticipantsByTournament(tournamentIds: string[]): TournamentParticipant[] {
  ensureDb();
  if (tournamentIds.length === 0) return [];
  const placeholders = tournamentIds.map(() => '?').join(',');
  return getDb().prepare(`SELECT * FROM tournament_participants WHERE tournament_id IN (${placeholders})`).all(...tournamentIds) as TournamentParticipant[];
}

export function getParticipantsForExtraction(tournamentId: string, useConfirmed: boolean): { user_id: string }[] {
  ensureDb();
  const col = useConfirmed ? 'confirmed' : 'participating';
  return getDb().prepare(`SELECT user_id FROM tournament_participants WHERE tournament_id = ? AND ${col} = 1`).all(tournamentId) as { user_id: string }[];
}

export function upsertParticipant(tournamentId: string, userId: string, confirmed: boolean, participating: boolean): void {
  ensureDb();
  getDb().prepare(
    `INSERT INTO tournament_participants (tournament_id, user_id, confirmed, participating)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tournament_id, user_id) DO UPDATE SET confirmed = ?, participating = ?`
  ).run(tournamentId, userId, confirmed ? 1 : 0, participating ? 1 : 0, confirmed ? 1 : 0, participating ? 1 : 0);
}

export function upsertParticipantConfirmed(tournamentId: string, userId: string, confirmed: boolean): void {
  ensureDb();
  getDb().prepare(
    `INSERT INTO tournament_participants (tournament_id, user_id, confirmed, participating)
     VALUES (?, ?, ?, 0)
     ON CONFLICT(tournament_id, user_id) DO UPDATE SET confirmed = ?`
  ).run(tournamentId, userId, confirmed ? 1 : 0, confirmed ? 1 : 0);
}

export function setParticipating(tournamentId: string, userId: string, participating: boolean): void {
  ensureDb();
  getDb().prepare(
    `INSERT INTO tournament_participants (tournament_id, user_id, confirmed, participating)
     VALUES (?, ?, 0, ?)
     ON CONFLICT(tournament_id, user_id) DO UPDATE SET participating = ?`
  ).run(tournamentId, userId, participating ? 1 : 0, participating ? 1 : 0);
}

export function removeParticipant(tournamentId: string, userId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM tournament_participants WHERE tournament_id = ? AND user_id = ?').run(tournamentId, userId);
}

// ============ PAIRS ============

export function getPairs(tournamentId: string): Pair[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM pairs WHERE tournament_id = ? ORDER BY seed').all(tournamentId) as Pair[];
}

export function getPairById(id: string): Pair | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM pairs WHERE id = ?').get(id) as Pair | undefined;
}

export function deletePairs(tournamentId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM pairs WHERE tournament_id = ?').run(tournamentId);
}

export function insertPairs(tournamentId: string, pairs: { player1_id: string; player2_id: string; seed: number }[]): void {
  ensureDb();
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO pairs (id, tournament_id, player1_id, player2_id, seed) VALUES (?, ?, ?, ?, ?)`
  );
  for (const p of pairs) {
    stmt.run(randomUUID(), tournamentId, p.player1_id, p.player2_id, p.seed);
  }
}

export function updatePairPlayers(pairId: string, player1Id: string, player2Id: string): void {
  ensureDb();
  getDb().prepare('UPDATE pairs SET player1_id = ?, player2_id = ? WHERE id = ?').run(player1Id, player2Id, pairId);
}

export function getNextPairSeed(tournamentId: string): number {
  ensureDb();
  const result = getDb().prepare('SELECT MAX(seed) as maxSeed FROM pairs WHERE tournament_id = ?').get(tournamentId) as { maxSeed: number | null };
  return (result.maxSeed || 0) + 1;
}

export function insertSinglePair(tournamentId: string, player1Id: string, player2Id: string): string {
  ensureDb();
  const id = randomUUID();
  const seed = getNextPairSeed(tournamentId);
  getDb().prepare(
    `INSERT INTO pairs (id, tournament_id, player1_id, player2_id, seed) VALUES (?, ?, ?, ?, ?)`
  ).run(id, tournamentId, player1Id, player2Id, seed);
  return id;
}

export function deletePair(pairId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM pairs WHERE id = ?').run(pairId);
}

// ============ MATCHES ============

export function getMatches(tournamentId: string): Match[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM matches WHERE tournament_id = ? ORDER BY bracket_type, round, order_in_round').all(tournamentId) as Match[];
}

export function getMatchById(id: string): Match | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM matches WHERE id = ?').get(id) as Match | undefined;
}

export function deleteMatches(tournamentId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM matches WHERE tournament_id = ?').run(tournamentId);
}

export function insertMatches(tournamentId: string, matches: Omit<Match, 'id' | 'tournament_id'>[]): void {
  ensureDb();
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO matches (id, tournament_id, round, bracket_type, pair1_id, pair2_id, score_pair1, score_pair2, winner_pair_id, order_in_round)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const m of matches) {
    stmt.run(randomUUID(), tournamentId, m.round, m.bracket_type, m.pair1_id, m.pair2_id, m.score_pair1, m.score_pair2, m.winner_pair_id, m.order_in_round);
  }
}

export function updateMatchResult(matchId: string, scorePair1: number, scorePair2: number, winnerId: string): void {
  ensureDb();
  getDb().prepare('UPDATE matches SET score_pair1 = ?, score_pair2 = ?, winner_pair_id = ? WHERE id = ?').run(scorePair1, scorePair2, winnerId, matchId);
}

export function updateMatchPairs(matchId: string, pair1Id: string | null, pair2Id: string | null): void {
  ensureDb();
  getDb().prepare('UPDATE matches SET pair1_id = ?, pair2_id = ? WHERE id = ?').run(pair1Id, pair2Id, matchId);
}

export interface MatchHistoryEntry {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  date: string;
  round: string;
  bracketType: string;
  opponentPairNames: string;
  scoreUs: number;
  scoreThem: number;
  isWin: boolean;
  orderInRound: number;
}

/** Ordine per sort cronologico: round_robin/girone giocato per primo, poi quarti, semi, finale. Valori alti = giocati prima. */
const ROUND_DISPLAY_ORDER: Record<string, number> = {
  round_robin: 7,           // Girone - giocato per primo
  quarterfinal: 6,          // Quarti di Finale
  semifinal: 5,             // Semifinali
  consolation_semi: 4,      // Semi Consolazione
  third_place: 3,           // 3° e 4° posto
  final: 2,                 // Finale
  consolation_final: 1,     // 5° e 6° posto
  consolation_seventh: 0,   // 7° e 8° posto - giocato per ultimo
};
const DEFAULT_ROUND_ORDER = 99;

export function getMatchHistoryForUser(userId: string): MatchHistoryEntry[] {
  ensureDb();
  const db = getDb();
  const userPairs = db.prepare('SELECT id FROM pairs WHERE player1_id = ? OR player2_id = ?').all(userId, userId) as { id: string }[];
  if (userPairs.length === 0) return [];

  const pairIds = userPairs.map((p) => p.id);
  const placeholders = pairIds.map(() => '?').join(',');

  const rows = db.prepare(`
    SELECT m.id as match_id, m.tournament_id, m.round, m.bracket_type, m.pair1_id, m.pair2_id,
           m.score_pair1, m.score_pair2, m.winner_pair_id, t.name as tournament_name, t.date, m.order_in_round
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE (m.pair1_id IN (${placeholders}) OR m.pair2_id IN (${placeholders}))
      AND m.score_pair1 IS NOT NULL AND m.score_pair2 IS NOT NULL
    ORDER BY t.date DESC, m.bracket_type, m.round, m.order_in_round
  `).all(...pairIds, ...pairIds) as Array<{
    match_id: string;
    tournament_id: string;
    round: string;
    bracket_type: string;
    pair1_id: string | null;
    pair2_id: string | null;
    score_pair1: number;
    score_pair2: number;
    winner_pair_id: string | null;
    tournament_name: string;
    date: string;
    order_in_round: number;
  }>;

  const pairIdsInMatches = new Set<string>();
  for (const r of rows) {
    if (r.pair1_id) pairIdsInMatches.add(r.pair1_id);
    if (r.pair2_id) pairIdsInMatches.add(r.pair2_id);
  }
  const pairMap = new Map<string, Pair>();
  for (const pid of Array.from(pairIdsInMatches)) {
    const p = getPairById(pid);
    if (p) pairMap.set(pid, p);
  }
  const users = getUsers();
  const userMap = new Map(users.map((u) => [u.id, u]));

  function getPairNames(pairId: string | null): string {
    if (!pairId) return 'TBD';
    const pair = pairMap.get(pairId);
    if (!pair) return 'TBD';
    const p1 = userMap.get(pair.player1_id);
    const p2 = userMap.get(pair.player2_id);
    const n1 = p1?.nickname || p1?.full_name || p1?.username || '?';
    const n2 = p2?.nickname || p2?.full_name || p2?.username || '?';
    return `${n1} / ${n2}`;
  }

  const result: MatchHistoryEntry[] = [];
  for (const r of rows) {
    const ourPairId = pairIds.includes(r.pair1_id || '') ? r.pair1_id! : r.pair2_id!;
    const opponentPairId = r.pair1_id === ourPairId ? r.pair2_id : r.pair1_id;
    const scoreUs = r.pair1_id === ourPairId ? r.score_pair1 : r.score_pair2;
    const scoreThem = r.pair1_id === ourPairId ? r.score_pair2 : r.score_pair1;
    const isWin = r.winner_pair_id === ourPairId;

    result.push({
      matchId: r.match_id,
      tournamentId: r.tournament_id,
      tournamentName: r.tournament_name,
      date: r.date,
      round: r.round,
      bracketType: r.bracket_type,
      opponentPairNames: getPairNames(opponentPairId),
      scoreUs,
      scoreThem,
      isWin,
      orderInRound: r.order_in_round,
    });
  }

  // Ordine cronologico: torneo (data DESC), poi round dalla prima partita all'ultima (girone→quarti→semi→finale), poi order_in_round
  const roundOrder = (round: string) => ROUND_DISPLAY_ORDER[round] ?? DEFAULT_ROUND_ORDER;
  result.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    const roundCmp = roundOrder(b.round) - roundOrder(a.round);
    if (roundCmp !== 0) return roundCmp;
    return a.orderInRound - b.orderInRound;
  });

  return result;
}

// ---------- Partite fuori torneo (prenotazioni centro sportivo senza torneo) ----------

export interface NonTournamentMatchHistoryEntry {
  bookingId: string;
  bookingName: string;
  date: string;
  opponentPairNames: string;
  scoreUs: number;
  scoreThem: number;
  isWin: boolean;
  /** user_id of the other player in our couple (same booking, same couple), or null if guest */
  partnerId: string | null;
}

export function getNonTournamentMatchHistoryForUser(userId: string): NonTournamentMatchHistoryEntry[] {
  ensureDb();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT cb.id AS booking_id, cb.booking_name, cb.date,
              m.result_winner, m.result_set1_c1, m.result_set1_c2, m.result_set2_c1, m.result_set2_c2, m.result_set3_c1, m.result_set3_c2,
              cbp.position AS our_position
       FROM court_booking_participants cbp
       JOIN court_bookings cb ON cb.id = cbp.booking_id AND cb.status = 'confirmed' AND cb.tournament_id IS NULL
       JOIN court_booking_matches m ON m.booking_id = cb.id AND m.result_winner IS NOT NULL
       WHERE cbp.user_id = ?
       ORDER BY cb.date DESC, cb.id`
    )
    .all(userId) as Array<{
    booking_id: string;
    booking_name: string;
    date: string;
    result_winner: number;
    result_set1_c1: number | null;
    result_set1_c2: number | null;
    result_set2_c1: number | null;
    result_set2_c2: number | null;
    result_set3_c1: number | null;
    result_set3_c2: number | null;
    our_position: number;
  }>;

  const bookingIds = [...new Set(rows.map((r) => r.booking_id))];
  const allParticipants: CourtBookingParticipant[] =
    bookingIds.length === 0
      ? []
      : (db
          .prepare(
            `SELECT * FROM court_booking_participants WHERE booking_id IN (${bookingIds.map(() => '?').join(',')}) ORDER BY booking_id, position`
          )
          .all(...bookingIds) as CourtBookingParticipant[]);
  const participantsByBooking = new Map<string, CourtBookingParticipant[]>();
  for (const p of allParticipants) {
    const list = participantsByBooking.get(p.booking_id) ?? [];
    list.push(p);
    participantsByBooking.set(p.booking_id, list);
  }
  const users = getUsers();
  const userMap = new Map(users.map((u) => [u.id, u]));

  function participantDisplayName(p: CourtBookingParticipant): string {
    if (p.user_id) {
      const u = userMap.get(p.user_id);
      return u?.nickname || u?.full_name || u?.username || '?';
    }
    const first = (p.guest_first_name ?? '').trim();
    const last = (p.guest_last_name ?? '').trim();
    return [first, last].filter(Boolean).join(' ') || 'Ospite';
  }

  const result: NonTournamentMatchHistoryEntry[] = [];
  for (const r of rows) {
    const isCouple1 = r.our_position === 1 || r.our_position === 2;
    const scoreUs =
      (isCouple1 ? (r.result_set1_c1 ?? 0) + (r.result_set2_c1 ?? 0) + (r.result_set3_c1 ?? 0) : (r.result_set1_c2 ?? 0) + (r.result_set2_c2 ?? 0) + (r.result_set3_c2 ?? 0));
    const scoreThem =
      (isCouple1 ? (r.result_set1_c2 ?? 0) + (r.result_set2_c2 ?? 0) + (r.result_set3_c2 ?? 0) : (r.result_set1_c1 ?? 0) + (r.result_set2_c1 ?? 0) + (r.result_set3_c1 ?? 0));
    const isWin = isCouple1 ? r.result_winner === 1 : r.result_winner === 2;

    const participants = participantsByBooking.get(r.booking_id) ?? [];
    const opponentPositions = isCouple1 ? [3, 4] : [1, 2];
    const opponentNames = opponentPositions
      .map((pos) => participants.find((p) => p.position === pos))
      .filter(Boolean)
      .map((p) => participantDisplayName(p!));
    const opponentPairNames = opponentNames.join(' / ') || '—';
    const partnerPosition = r.our_position === 1 ? 2 : r.our_position === 2 ? 1 : r.our_position === 3 ? 4 : 3;
    const partnerParticipant = participants.find((p) => p.position === partnerPosition);
    const partnerId = partnerParticipant?.user_id ?? null;

    result.push({
      bookingId: r.booking_id,
      bookingName: r.booking_name || 'Partita amichevole',
      date: r.date,
      opponentPairNames,
      scoreUs,
      scoreThem,
      isWin,
      partnerId,
    });
  }

  return result;
}

/** Minimal entry shape for computing aggregate stats (tournament + non-tournament). */
export interface MatchStatsEntry {
  scoreUs: number;
  scoreThem: number;
  isWin: boolean;
}

/** Computes PlayerStats from a list of match entries (e.g. for "Tutte le partite"). List should be sorted by date DESC (newest first) for correct streak. */
export function computePlayerStatsFromMatchList(entries: MatchStatsEntry[]): Omit<PlayerStats, 'favoritePartner'> & { favoritePartner: null } {
  const matchesWon = entries.filter((m) => m.isWin).length;
  const matchesLost = entries.filter((m) => !m.isWin).length;
  const matchesTotal = entries.length;
  const winRate = matchesTotal > 0 ? Math.round((matchesWon / matchesTotal) * 100) : 0;
  const gamesWon = entries.reduce((sum, m) => sum + m.scoreUs, 0);
  const gamesLost = entries.reduce((sum, m) => sum + m.scoreThem, 0);
  const gamesTotal = gamesWon + gamesLost;
  const gamesWinRate = gamesTotal > 0 ? Math.round((gamesWon / gamesTotal) * 100) : 0;
  let currentWinStreak = 0;
  for (let i = 0; i < entries.length && entries[i].isWin; i++) currentWinStreak++;
  let bestWinStreak = 0;
  let run = 0;
  for (const m of entries) {
    if (m.isWin) {
      run++;
      bestWinStreak = Math.max(bestWinStreak, run);
    } else {
      run = 0;
    }
  }
  return {
    matchesWon,
    matchesLost,
    matchesTotal,
    winRate,
    gamesWon,
    gamesLost,
    gamesTotal,
    gamesWinRate,
    currentWinStreak,
    bestWinStreak,
    favoritePartner: null,
  };
}

export interface PlayerStats {
  matchesWon: number;
  matchesLost: number;
  matchesTotal: number;
  winRate: number;
  gamesWon: number;
  gamesLost: number;
  gamesTotal: number;
  gamesWinRate: number;
  currentWinStreak: number;
  bestWinStreak: number;
  favoritePartner: { id: string; name: string; matchesTogether: number } | null;
}

export function getPlayerStats(userId: string): PlayerStats {
  ensureDb();
  const matchHistory = getMatchHistoryForUser(userId);

  const matchesWon = matchHistory.filter((m) => m.isWin).length;
  const matchesLost = matchHistory.filter((m) => !m.isWin).length;
  const matchesTotal = matchHistory.length;
  const winRate = matchesTotal > 0 ? Math.round((matchesWon / matchesTotal) * 100) : 0;

  const gamesWon = matchHistory.reduce((sum, m) => sum + m.scoreUs, 0);
  const gamesLost = matchHistory.reduce((sum, m) => sum + m.scoreThem, 0);
  const gamesTotal = gamesWon + gamesLost;
  const gamesWinRate = gamesTotal > 0 ? Math.round((gamesWon / gamesTotal) * 100) : 0;

  let currentWinStreak = 0;
  for (let i = 0; i < matchHistory.length && matchHistory[i].isWin; i++) currentWinStreak++;

  let bestWinStreak = 0;
  let run = 0;
  for (const m of matchHistory) {
    if (m.isWin) {
      run++;
      bestWinStreak = Math.max(bestWinStreak, run);
    } else {
      run = 0;
    }
  }

  let favoritePartner: PlayerStats['favoritePartner'] = null;
  const userPairs = getDb().prepare('SELECT id, player1_id, player2_id FROM pairs WHERE player1_id = ? OR player2_id = ?').all(userId, userId) as Array<{ id: string; player1_id: string; player2_id: string }>;
  const partnerCounts = new Map<string, number>();
  for (const p of userPairs) {
    const partnerId = p.player1_id === userId ? p.player2_id : p.player1_id;
    const count = getDb().prepare('SELECT COUNT(*) as c FROM matches WHERE (pair1_id = ? OR pair2_id = ?) AND score_pair1 IS NOT NULL AND score_pair2 IS NOT NULL').get(p.id, p.id) as { c: number };
    partnerCounts.set(partnerId, (partnerCounts.get(partnerId) ?? 0) + count.c);
  }
  if (partnerCounts.size > 0) {
    let maxPartnerId: string | null = null;
    let maxCount = 0;
    for (const [pid, c] of Array.from(partnerCounts.entries())) {
      if (c > maxCount) {
        maxCount = c;
        maxPartnerId = pid;
      }
    }
    if (maxPartnerId) {
      const partnerUser = getUserById(maxPartnerId);
      if (partnerUser) {
        favoritePartner = {
          id: maxPartnerId,
          name: partnerUser.nickname || partnerUser.full_name || partnerUser.username || '?',
          matchesTogether: maxCount,
        };
      }
    }
  }

  return {
    matchesWon,
    matchesLost,
    matchesTotal,
    winRate,
    gamesWon,
    gamesLost,
    gamesTotal,
    gamesWinRate,
    currentWinStreak,
    bestWinStreak,
    favoritePartner,
  };
}

export function getNonTournamentPlayerStats(userId: string): PlayerStats {
  ensureDb();
  const matchHistory = getNonTournamentMatchHistoryForUser(userId);
  const base = computePlayerStatsFromMatchList(matchHistory);
  let favoritePartner: PlayerStats['favoritePartner'] = null;
  const partnerCounts = new Map<string, number>();
  for (const m of matchHistory) {
    if (m.partnerId) {
      partnerCounts.set(m.partnerId, (partnerCounts.get(m.partnerId) ?? 0) + 1);
    }
  }
  if (partnerCounts.size > 0) {
    let maxPartnerId: string | null = null;
    let maxCount = 0;
    for (const [pid, c] of Array.from(partnerCounts.entries())) {
      if (c > maxCount) {
        maxCount = c;
        maxPartnerId = pid;
      }
    }
    if (maxPartnerId) {
      const partnerUser = getUserById(maxPartnerId);
      if (partnerUser) {
        favoritePartner = {
          id: maxPartnerId,
          name: partnerUser.nickname || partnerUser.full_name || partnerUser.username || '?',
          matchesTogether: maxCount,
        };
      }
    }
  }
  return {
    ...base,
    favoritePartner,
  };
}

// ============ HISTORY FOR CHARTS ============

export interface OverallScoreHistoryEntry {
  date: string;
  overall_score: number;
}

export interface PointsHistoryEntry {
  date: string;
  cumulative_points: number;
}

/** Tornei in cui l'utente ha partecipato (è in una coppia), ordinati per data ASC. */
function getTournamentsForUserChronologically(userId: string): Tournament[] {
  ensureDb();
  const pairs = getDb().prepare('SELECT tournament_id FROM pairs WHERE player1_id = ? OR player2_id = ?').all(userId, userId) as { tournament_id: string }[];
  const tournamentIds = Array.from(new Set(pairs.map((p) => p.tournament_id)));
  if (tournamentIds.length === 0) return [];
  const all = getTournaments();
  const byId = new Map(all.map((t) => [t.id, t]));
  const list = tournamentIds.map((id) => byId.get(id)).filter(Boolean) as Tournament[];
  list.sort((a, b) => a.date.localeCompare(b.date));
  return list;
}

/** Storico overall: inizio 1 gen 2025 (seed o 50), poi un punto per ogni torneo completato (data >= 2025-01-01). */
export function getOverallScoreHistory(userId: string): OverallScoreHistoryEntry[] {
  ensureDb();
  const allTournaments = getTournamentsForUserChronologically(userId);
  const tournaments = allTournaments.filter((t) => t.date >= CHART_START_DATE);
  const initialScore = getSeedOverallScoreForUser(userId) ?? 50;
  const result: OverallScoreHistoryEntry[] = [{ date: CHART_START_DATE, overall_score: initialScore }];
  let score = initialScore;

  for (const t of tournaments) {
    const pairs = getPairs(t.id);
    const userPair = pairs.find((p) => p.player1_id === userId || p.player2_id === userId);
    if (!userPair) continue;

    const matches = getMatches(t.id).filter((m) => m.winner_pair_id != null);
    const rankings = getTournamentRankings(t.id);
    const pairIdToPosition = new Map(rankings.map((r) => [r.pair_id, r.position]));

    let wins = 0;
    let losses = 0;
    for (const m of matches) {
      const winnerId = m.winner_pair_id!;
      const loserId = m.pair1_id === winnerId ? m.pair2_id : m.pair1_id;
      if (!loserId) continue;
      if (winnerId === userPair.id) wins++;
      else if (loserId === userPair.id) losses++;
    }
    const position = pairIdToPosition.get(userPair.id);

    const is8Player = t.max_players === 8;
    const posWinDelta = is8Player ? TOURNAMENT_WIN_DELTA_8 : TOURNAMENT_WIN_DELTA;
    const lastPos = is8Player ? TOURNAMENT_LAST_POSITION_8 : 8;
    const lastDelta = is8Player ? TOURNAMENT_LAST_DELTA_8 : TOURNAMENT_LAST_DELTA;

    let delta = wins * MATCH_WIN_DELTA + losses * MATCH_LOSS_DELTA;
    if (position === 1) delta += posWinDelta;
    if (position === lastPos) delta += lastDelta;

    score = Math.max(0, Math.min(100, score + delta));
    result.push({ date: t.date, overall_score: score });
  }

  // Non aggiungiamo un punto con data "oggi" per allineare al valore in DB: creerebbe l'impressione
  // che siano stati assegnati punti in una data in cui non c'è stato nessun torneo.
  return result;
}

/** Storico punti ATP cumulativi: inizio 1 gen 2025 con 0, poi un punto per ogni torneo completato (data >= 2025-01-01). */
export function getPointsHistory(userId: string): PointsHistoryEntry[] {
  ensureDb();
  const allTournaments = getTournamentsForUserChronologically(userId);
  const tournaments = allTournaments.filter((t) => t.date >= CHART_START_DATE);
  const result: PointsHistoryEntry[] = [{ date: CHART_START_DATE, cumulative_points: 0 }];
  let cumulative = 0;

  for (const t of tournaments) {
    const pairs = getPairs(t.id);
    const userPair = pairs.find((p) => p.player1_id === userId || p.player2_id === userId);
    if (!userPair) continue;

    const rankings = getTournamentRankings(t.id);
    const row = rankings.find((r) => r.pair_id === userPair.id);
    const points = row?.points ?? 0;
    cumulative += points;
    result.push({ date: t.date, cumulative_points: cumulative });
  }
  return result;
}

// ============ RANKINGS ============

export function getTournamentRankings(tournamentId: string): TournamentRanking[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM tournament_rankings WHERE tournament_id = ? ORDER BY position').all(tournamentId) as TournamentRanking[];
}

export function deleteTournamentRankings(tournamentId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM tournament_rankings WHERE tournament_id = ?').run(tournamentId);
}

export function insertTournamentRanking(data: TournamentRanking): void {
  ensureDb();
  getDb().prepare(
    `INSERT INTO tournament_rankings (tournament_id, pair_id, position, points, is_override)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tournament_id, pair_id) DO UPDATE SET position = ?, points = ?, is_override = ?`
  ).run(data.tournament_id, data.pair_id, data.position, data.points, data.is_override, data.position, data.points, data.is_override);
}

// ============ MVP VOTING ============

const MVP_VOTING_HOURS = 48;

export function getMvpDeadline(tournament: Tournament | undefined): Date | null {
  if (!tournament?.completed_at) return null;
  if (tournament.mvp_deadline) {
    const d = new Date(tournament.mvp_deadline);
    return isNaN(d.getTime()) ? null : d;
  }
  const completedAt = new Date(tournament.completed_at);
  return new Date(completedAt.getTime() + MVP_VOTING_HOURS * 60 * 60 * 1000);
}

export function getTournamentParticipantUserIds(tournamentId: string): string[] {
  ensureDb();
  const rows = getDb().prepare(`
    SELECT DISTINCT player1_id as user_id FROM pairs WHERE tournament_id = ?
    UNION
    SELECT DISTINCT player2_id FROM pairs WHERE tournament_id = ?
  `).all(tournamentId, tournamentId) as { user_id: string }[];
  return rows.map(r => r.user_id);
}

export function getTournamentMvp(tournamentId: string): string | null {
  ensureDb();
  const row = getDb().prepare('SELECT mvp_user_id FROM tournament_mvp WHERE tournament_id = ?').get(tournamentId) as { mvp_user_id: string } | undefined;
  return row?.mvp_user_id ?? null;
}

export function finalizeMvpIfNeeded(tournamentId: string): void {
  ensureDb();
  const db = getDb();
  const existing = db.prepare('SELECT 1 FROM tournament_mvp WHERE tournament_id = ?').get(tournamentId);
  if (existing) return;

  const tournament = getTournamentById(tournamentId);
  if (!tournament || tournament.status !== 'completed' || !tournament.completed_at) return;

  const participantIds = getTournamentParticipantUserIds(tournamentId);
  if (participantIds.length === 0) return;

  const votes = db.prepare('SELECT voted_user_id FROM mvp_votes WHERE tournament_id = ?').all(tournamentId) as { voted_user_id: string }[];
  const deadline = getMvpDeadline(tournament);
  if (!deadline) return;
  const now = new Date();

  const allVoted = votes.length >= participantIds.length;
  const timeExpired = now >= deadline;

  if (!allVoted && !timeExpired) return;

  // Non assegniamo mai in automatico: l'admin deve sempre assegnare o confermare
}

export function isMvpVotingOpen(tournamentId: string): boolean {
  ensureDb();
  const db = getDb();
  if (db.prepare('SELECT 1 FROM tournament_mvp WHERE tournament_id = ?').get(tournamentId)) return false;

  const tournament = getTournamentById(tournamentId);
  if (!tournament || tournament.status !== 'completed' || !tournament.completed_at) return false;

  const participantIds = getTournamentParticipantUserIds(tournamentId);
  const votes = db.prepare('SELECT 1 FROM mvp_votes WHERE tournament_id = ?').all(tournamentId);
  const deadline = getMvpDeadline(tournament);
  if (!deadline) return false;
  const now = new Date();

  if (now >= deadline) return false;
  if (votes.length >= participantIds.length) return false;
  return true;
}

export interface MvpVotingStatus {
  isOpen: boolean;
  closesAt: string | null;
  allVoted: boolean;
  participantCount: number;
  votedCount: number;
  userHasVoted: boolean;
  userVotedFor: string | null;
  voterCanVote: boolean;
  candidates: { id: string; name: string }[];
  needsAdminAssignment: boolean;
}

export function getMvpVotingStatus(tournamentId: string, userId: string | null): MvpVotingStatus {
  ensureDb();
  finalizeMvpIfNeeded(tournamentId);
  const db = getDb();
  const tournament = getTournamentById(tournamentId);
  const participantIds = getTournamentParticipantUserIds(tournamentId);
  const participantSet = new Set(participantIds);

  const result: MvpVotingStatus = {
    isOpen: false,
    closesAt: null,
    allVoted: false,
    participantCount: participantIds.length,
    votedCount: 0,
    userHasVoted: false,
    userVotedFor: null,
    voterCanVote: false,
    candidates: [],
    needsAdminAssignment: false,
  };

  if (!tournament || tournament.status !== 'completed' || !tournament.completed_at) return result;

  const deadline = getMvpDeadline(tournament);
  if (!deadline) return result;
  result.closesAt = deadline.toISOString();

  const mvpExists = db.prepare('SELECT 1 FROM tournament_mvp WHERE tournament_id = ?').get(tournamentId);
  if (mvpExists) return result;

  const votes = db.prepare('SELECT voter_user_id, voted_user_id FROM mvp_votes WHERE tournament_id = ?').all(tournamentId) as { voter_user_id: string; voted_user_id: string }[];
  result.votedCount = votes.length;
  result.allVoted = votes.length >= participantIds.length;

  if (userId) {
    const userVote = votes.find(v => v.voter_user_id === userId);
    result.userHasVoted = !!userVote;
    result.userVotedFor = userVote?.voted_user_id ?? null;
    result.voterCanVote = participantSet.has(userId);
  }

  const now = new Date();
  const timeExpired = now >= deadline;
  result.isOpen = now < deadline && !result.allVoted;
  result.needsAdminAssignment = (result.allVoted || timeExpired) && !mvpExists;

  const users = getUsersByIds(participantIds);
  result.candidates = users
    .filter(u => !userId || u.id !== userId)
    .map(u => ({
      id: u.id,
      name: u.nickname || u.full_name || u.username || '?',
    }));

  return result;
}

export function setMvpDeadline(tournamentId: string, deadline: string | null): void {
  ensureDb();
  updateTournament(tournamentId, { mvp_deadline: deadline });
}

export function closeMvpVoting(tournamentId: string, mvpUserId: string | null): void {
  ensureDb();
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO tournament_mvp (tournament_id, mvp_user_id) VALUES (?, ?)').run(tournamentId, mvpUserId);
  recalculateCumulativeRankings();
}

export function reopenMvpVoting(tournamentId: string): void {
  ensureDb();
  const db = getDb();
  db.prepare('DELETE FROM tournament_mvp WHERE tournament_id = ?').run(tournamentId);
  const newDeadline = new Date(Date.now() + MVP_VOTING_HOURS * 60 * 60 * 1000).toISOString();
  updateTournament(tournamentId, { mvp_deadline: newDeadline });
  recalculateCumulativeRankings();
}

export function getMvpVoteCounts(tournamentId: string): { userId: string; voteCount: number; name: string }[] {
  ensureDb();
  const db = getDb();
  const votes = db.prepare('SELECT voted_user_id FROM mvp_votes WHERE tournament_id = ?').all(tournamentId) as { voted_user_id: string }[];
  const counts = new Map<string, number>();
  for (const v of votes) {
    counts.set(v.voted_user_id, (counts.get(v.voted_user_id) ?? 0) + 1);
  }
  const participantIds = getTournamentParticipantUserIds(tournamentId);
  const users = getUsersByIds(participantIds);
  const userMap = new Map(users.map(u => [u.id, u]));
  return Array.from(counts.entries())
    .map(([userId, voteCount]) => ({
      userId,
      voteCount,
      name: userMap.get(userId)?.nickname || userMap.get(userId)?.full_name || userMap.get(userId)?.username || '?',
    }))
    .sort((a, b) => b.voteCount - a.voteCount);
}

export function submitMvpVote(tournamentId: string, voterId: string, votedUserId: string): boolean {
  ensureDb();
  const participantIds = getTournamentParticipantUserIds(tournamentId);
  if (!participantIds.includes(voterId)) return false;
  if (!participantIds.includes(votedUserId)) return false;
  if (voterId === votedUserId) return false;

  getDb().prepare(
    'INSERT OR REPLACE INTO mvp_votes (tournament_id, voter_user_id, voted_user_id) VALUES (?, ?, ?)'
  ).run(tournamentId, voterId, votedUserId);
  return true;
}

export function getTournamentsWithOpenMvpVoting(userId: string, isAdmin?: boolean): Array<{ tournament: Tournament; status: MvpVotingStatus }> {
  ensureDb();
  const db = getDb();
  const tournaments = db.prepare(`
    SELECT * FROM tournaments 
    WHERE status = 'completed' AND completed_at IS NOT NULL AND completed_at != ''
    ORDER BY completed_at DESC
  `).all() as Tournament[];

  const result: Array<{ tournament: Tournament; status: MvpVotingStatus }> = [];
  for (const t of tournaments) {
    const status = getMvpVotingStatus(t.id, userId);
    const canVote = status.voterCanVote && !status.userHasVoted;
    const showVotingBanner = status.isOpen && (canVote || !status.voterCanVote);
    const showAssignmentBanner = isAdmin && status.needsAdminAssignment;
    if (showVotingBanner || showAssignmentBanner) {
      result.push({ tournament: t, status });
    }
  }
  return result;
}

// ============ CUMULATIVE RANKINGS ============

export function getCumulativeRankings(): CumulativeRanking[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM cumulative_rankings ORDER BY total_points DESC').all() as CumulativeRanking[];
}

export function getCumulativeByUserIds(userIds: string[]): CumulativeRanking[] {
  ensureDb();
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return getDb().prepare(`SELECT * FROM cumulative_rankings WHERE user_id IN (${placeholders})`).all(...userIds) as CumulativeRanking[];
}

export function upsertCumulativeRanking(userId: string, totalPoints: number, isOverride: boolean): void {
  ensureDb();
  getDb().prepare(
    `INSERT INTO cumulative_rankings (user_id, total_points, is_override, gold_medals, silver_medals, bronze_medals, wooden_spoons)
     VALUES (?, ?, ?, 0, 0, 0, 0)
     ON CONFLICT(user_id) DO UPDATE SET total_points = ?, is_override = ?`
  ).run(userId, totalPoints, isOverride ? 1 : 0, totalPoints, isOverride ? 1 : 0);
}

export function recalculateCumulativeRankings(): void {
  ensureDb();
  const db = getDb();
  
  // Prende tutti i punti dei giocatori dai ranking dei tornei
  const points = db.prepare(`
    SELECT u.id as user_id, COALESCE(SUM(tr.points), 0) as total
    FROM users u
    LEFT JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    LEFT JOIN tournament_rankings tr ON tr.pair_id = p.id
    GROUP BY u.id
  `).all() as { user_id: string; total: number }[];

  // Calcola medaglie per ogni giocatore
  // Gold: posizione 1
  const goldMedals = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    WHERE tr.position = 1
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // Silver: posizione 2
  const silverMedals = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    WHERE tr.position = 2
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // Bronze: posizione 3
  const bronzeMedals = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    WHERE tr.position = 3
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // Wooden spoon: posizione 8
  const woodenSpoons = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    WHERE tr.position = 8
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // MVP: da tournament_mvp (escludi righe con mvp_user_id NULL)
  const mvpCounts = db.prepare(`
    SELECT mvp_user_id as user_id, COUNT(*) as count
    FROM tournament_mvp
    WHERE mvp_user_id IS NOT NULL AND mvp_user_id != ''
    GROUP BY mvp_user_id
  `).all() as { user_id: string; count: number }[];

  // Crea mappe per accesso rapido
  const goldMap = new Map(goldMedals.map(m => [m.user_id, m.count]));
  const silverMap = new Map(silverMedals.map(m => [m.user_id, m.count]));
  const bronzeMap = new Map(bronzeMedals.map(m => [m.user_id, m.count]));
  const spoonMap = new Map(woodenSpoons.map(m => [m.user_id, m.count]));
  const mvpMap = new Map(mvpCounts.map(m => [m.user_id, m.count]));

  // Aggiorna tutti i record (solo quelli non in override per i punti)
  const stmt = db.prepare(
    `INSERT INTO cumulative_rankings (user_id, total_points, is_override, gold_medals, silver_medals, bronze_medals, wooden_spoons, mvp_count)
     VALUES (?, ?, 0, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET 
       total_points = CASE WHEN is_override = 0 THEN ? ELSE total_points END,
       gold_medals = ?,
       silver_medals = ?,
       bronze_medals = ?,
       wooden_spoons = ?,
       mvp_count = ?`
  );

  for (const p of points) {
    const gold = goldMap.get(p.user_id) || 0;
    const silver = silverMap.get(p.user_id) || 0;
    const bronze = bronzeMap.get(p.user_id) || 0;
    const spoon = spoonMap.get(p.user_id) || 0;
    const mvp = mvpMap.get(p.user_id) || 0;
    stmt.run(p.user_id, p.total, gold, silver, bronze, spoon, mvp, p.total, gold, silver, bronze, spoon, mvp);
  }
}

// ============ GALLERY ============

export interface GalleryMedia {
  id: string;
  filename: string;
  file_path: string;
  size_bytes: number;
  type: 'image' | 'video';
  mime_type: string;
  user_id: string;
  created_at: string;
}

export function insertGalleryMedia(data: {
  filename: string;
  file_path: string;
  size_bytes: number;
  type: 'image' | 'video';
  mime_type: string;
  user_id: string;
}): string {
  ensureDb();
  const id = randomUUID();
  getDb().prepare(
    `INSERT INTO gallery_media (id, filename, file_path, size_bytes, type, mime_type, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.filename, data.file_path, data.size_bytes, data.type, data.mime_type, data.user_id);
  return id;
}

export function getGalleryMedia(options?: { limit?: number; offset?: number }): GalleryMedia[] {
  ensureDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  return getDb().prepare(
    'SELECT * FROM gallery_media ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as GalleryMedia[];
}

export function getGalleryMediaCount(): number {
  ensureDb();
  const row = getDb().prepare('SELECT COUNT(*) as c FROM gallery_media').get() as { c: number };
  return row?.c ?? 0;
}

export function getGalleryMediaById(id: string): GalleryMedia | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM gallery_media WHERE id = ?').get(id) as GalleryMedia | undefined;
}

export function deleteGalleryMedia(id: string): boolean {
  ensureDb();
  const r = getDb().prepare('DELETE FROM gallery_media WHERE id = ?').run(id);
  return r.changes > 0;
}

export function getGalleryTotalSize(): number {
  ensureDb();
  const row = getDb().prepare('SELECT COALESCE(SUM(size_bytes), 0) as total FROM gallery_media').get() as { total: number };
  return row?.total ?? 0;
}

// ============ SECURITY LOGS ============

export type SecurityLogType = 'login_failed' | 'auth_401' | 'auth_403' | 'admin_access';

export interface SecurityLog {
  id: number;
  type: SecurityLogType;
  ip: string | null;
  username: string | null;
  path: string | null;
  details: string | null;
  created_at: string;
}

export function logSecurityEvent(data: {
  type: SecurityLogType;
  ip?: string | null;
  username?: string | null;
  path?: string | null;
  details?: string | null;
}): void {
  try {
    ensureDb();
    getDb()
      .prepare(
        'INSERT INTO security_logs (type, ip, username, path, details) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        data.type,
        data.ip ?? null,
        data.username ?? null,
        data.path ?? null,
        data.details ?? null
      );
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

export function getSecurityLogs(options: {
  type?: SecurityLogType;
  limit?: number;
  offset?: number;
  since?: string;
}): { logs: SecurityLog[]; total: number } {
  ensureDb();
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (options.type) {
    conditions.push('type = ?');
    params.push(options.type);
  }
  if (options.since) {
    conditions.push('created_at >= ?');
    params.push(options.since);
  }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM security_logs${where}`).get(...params) as { c: number };
  const total = countRow.c;
  const limit = Math.min(options.limit ?? 100, 500);
  const offset = options.offset ?? 0;
  const logs = db
    .prepare(
      `SELECT id, type, ip, username, path, details, created_at FROM security_logs${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as SecurityLog[];
  return { logs, total };
}

export function deleteSecurityLogs(ids: number[]): number {
  if (ids.length === 0) return 0;
  ensureDb();
  const placeholders = ids.map(() => '?').join(',');
  const result = getDb().prepare(`DELETE FROM security_logs WHERE id IN (${placeholders})`).run(...ids);
  return result.changes;
}

export function deleteSecurityLogsBefore(before: string): number {
  ensureDb();
  const result = getDb().prepare('DELETE FROM security_logs WHERE created_at < ?').run(before);
  return result.changes;
}

// ============ PAGE VIEWS / ANALYTICS ============

export function recordPageView(path: string): void {
  ensureDb();
  getDb().prepare('INSERT INTO page_views (path, viewed_at) VALUES (?, datetime(\'now\'))').run(path);
}

export function getPageViewStats(): { byPath: { path: string; count: number }[]; total: number } {
  ensureDb();
  const byPath = getDb()
    .prepare('SELECT path, COUNT(*) as count FROM page_views GROUP BY path ORDER BY count DESC')
    .all() as { path: string; count: number }[];
  const row = getDb().prepare('SELECT COUNT(*) as total FROM page_views').get() as { total: number };
  return { byPath, total: row.total };
}
