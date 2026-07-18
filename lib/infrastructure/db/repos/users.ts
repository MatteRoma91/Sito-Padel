import { cache } from 'react';
import { getDb } from '@/lib/db/db';
import { initSchema } from '@/lib/db/schema';
import { seed } from '@/lib/db/seed';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '@/lib/constants';
import type { User, Tournament, TournamentParticipant, Pair, Match, TournamentRanking, CumulativeRanking, SkillLevel, TournamentCategory, Court, CourtBooking, CourtBookingParticipant, CenterClosedSlot, CourtBookingMatch, TournamentFormat } from '@/lib/types';
import { overallScoreToLevel, overallLevelToSkillLevel, MATCH_WIN_DELTA, MATCH_LOSS_DELTA, TOURNAMENT_WIN_DELTA, TOURNAMENT_LAST_DELTA, TOURNAMENT_WIN_DELTA_8, TOURNAMENT_LAST_DELTA_8, TOURNAMENT_LAST_POSITION_8, getTournamentFormat, getLastRankingPosition } from '@/lib/types';
import { DEFAULT_SITE_CONFIG } from '@/lib/db/site-config-defaults';
import { ensureDb } from './ensure';
import { recalculateCumulativeRankings } from './cumulative';
import { getMatches } from './matches';
import { getPairs } from './pairs';
import { getTournamentRankings, deleteTournamentRankings, clearSaliscendiFinalFlags, deleteMvpDataForTournament } from './rankings';
import { getTournaments, getTournamentById, updateTournament } from './tournaments';

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

/** Calcola i delta overall per utente in base a classifica + match del torneo. */
export function computeTournamentOverallDeltas(tournamentId: string): Map<string, number> {
  ensureDb();
  const tournament = getTournamentById(tournamentId);
  const deltas = new Map<string, number>();
  if (!tournament) return deltas;
  const fmt = getTournamentFormat(tournament);
  const is8Player = fmt === 'round_robin_8';

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
  const lastPos = getLastRankingPosition(tournament);
  const lastDelta = is8Player ? TOURNAMENT_LAST_DELTA_8 : TOURNAMENT_LAST_DELTA;

  for (const pair of pairs) {
    for (const userId of [pair.player1_id, pair.player2_id]) {
      const wins = userIdToWins.get(userId) ?? 0;
      const losses = userIdToLosses.get(userId) ?? 0;
      const position = userIdToPosition.get(userId);
      let delta = wins * MATCH_WIN_DELTA + losses * MATCH_LOSS_DELTA;
      if (position === 1) delta += posWinDelta;
      if (position === lastPos) delta += lastDelta;
      deltas.set(userId, delta);
    }
  }
  return deltas;
}

function applyOverallDeltas(deltas: Map<string, number>, multiplier: 1 | -1): void {
  for (const [userId, delta] of deltas) {
    if (delta === 0) continue;
    const user = getUserById(userId);
    const current = user?.overall_score != null ? user.overall_score : 50;
    const newScore = Math.max(0, Math.min(100, current + delta * multiplier));
    updateUser(userId, { overall_score: newScore });
  }
}

export function isTournamentOverallApplied(tournamentId: string): boolean {
  ensureDb();
  const t = getTournamentById(tournamentId);
  return Boolean(t?.overall_applied_at);
}

/** Applica i risultati del torneo al punteggio overall. Idempotente se già consolidato. */
export function applyTournamentResultToOverall(
  tournamentId: string,
  options?: { force?: boolean }
): void {
  ensureDb();
  const tournament = getTournamentById(tournamentId);
  if (!tournament) return;

  if (tournament.overall_applied_at && !options?.force) {
    return;
  }
  if (tournament.overall_applied_at && options?.force) {
    revertTournamentResultFromOverall(tournamentId);
  }

  const deltas = computeTournamentOverallDeltas(tournamentId);
  applyOverallDeltas(deltas, 1);
  setTournamentOverallAppliedAt(tournamentId, new Date().toISOString());
}

/** Annulla l'effetto overall di un torneo già consolidato. */
export function revertTournamentResultFromOverall(tournamentId: string): void {
  ensureDb();
  const tournament = getTournamentById(tournamentId);
  if (!tournament?.overall_applied_at) return;

  const deltas = computeTournamentOverallDeltas(tournamentId);
  applyOverallDeltas(deltas, -1);
  clearTournamentOverallAppliedAt(tournamentId);
}

export function setTournamentOverallAppliedAt(tournamentId: string, at: string): void {
  ensureDb();
  getDb().prepare('UPDATE tournaments SET overall_applied_at = ? WHERE id = ?').run(at, tournamentId);
}

export function clearTournamentOverallAppliedAt(tournamentId: string): void {
  ensureDb();
  getDb().prepare('UPDATE tournaments SET overall_applied_at = NULL WHERE id = ?').run(tournamentId);
}

/** Baseline overall: seed se in lista, altrimenti 50. */
export function getBaselineOverallScoreForUser(userId: string): number {
  return getSeedOverallScoreForUser(userId) ?? 50;
}

/** Reset overall di tutti i giocatori al baseline (seed o 50). */
export function resetAllPlayerOverallToBaseline(): void {
  ensureDb();
  for (const u of getUsers()) {
    if (u.role !== 'player') continue;
    updateUser(u.id, { overall_score: getBaselineOverallScoreForUser(u.id) });
  }
}

export function clearAllTournamentOverallAppliedFlags(): void {
  ensureDb();
  getDb().prepare('UPDATE tournaments SET overall_applied_at = NULL').run();
}

/** Ricostruisce overall da tornei completati (solo admin / ricalcola tutto). */
export function rebuildOverallFromCompletedTournaments(): number {
  ensureDb();
  resetAllPlayerOverallToBaseline();
  clearAllTournamentOverallAppliedFlags();
  const completed = getTournaments()
    .filter(t => t.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
  let n = 0;
  for (const t of completed) {
    const pairs = getPairs(t.id);
    const rankings = getTournamentRankings(t.id);
    if (pairs.length === 0 || rankings.length === 0) continue;
    applyTournamentResultToOverall(t.id);
    n++;
  }
  return n;
}

/** Riapre un torneo completato: annulla overall, rimuove classifica torneo, pulizia MVP/Saliscendi, ATP aggiornata. */
export function reopenTournament(tournamentId: string): void {
  ensureDb();
  revertTournamentResultFromOverall(tournamentId);
  deleteTournamentRankings(tournamentId);
  const tournament = getTournamentById(tournamentId);
  if (tournament && getTournamentFormat(tournament) === 'saliscendi_12') {
    clearSaliscendiFinalFlags(tournamentId);
  }
  deleteMvpDataForTournament(tournamentId);
  updateTournament(tournamentId, {
    status: 'in_progress',
    completed_at: null,
    mvp_deadline: null,
  });
  recalculateCumulativeRankings();
}


const OVERALL_SCORE_SEED: { name: string; score: number }[] = [
  { name: 'Faber', score: 90 }, { name: 'David', score: 90 }, { name: 'Cora', score: 86 }, { name: 'Gerva', score: 83 },
  { name: 'Mich', score: 82 }, { name: 'Braccio', score: 76 }, { name: 'Gazzella', score: 74 }, { name: 'Merzio', score: 73 },
  { name: 'Dile', score: 72 }, { name: 'Fabio', score: 71 }, { name: 'Wakki', score: 71 }, { name: 'Dibby', score: 70 },
  { name: 'Scimmia', score: 69 }, { name: 'Danti', score: 67 }, { name: 'Veca', score: 65 }, { name: 'Valerio', score: 65 },
  { name: 'DonMatteo', score: 65 }, { name: 'StefanoDio', score: 66 }, { name: 'Ema baldi', score: 60 },
  { name: 'Renni', score: 60 }, { name: 'Porra', score: 58 }, { name: 'Fefo', score: 56 }, { name: 'Jullios', score: 54 },
  { name: 'Marcello', score: 51 }, { name: 'Samba', score: 48 }, { name: 'Marco', score: 45 },
];

/** Data di inizio per i grafici: lo storico parte dal 1 gennaio 2025 e si aggiorna a ogni torneo completato. */
export const CHART_START_DATE = '2025-01-01';

/** Restituisce il punteggio seed per l'utente (se in OVERALL_SCORE_SEED), altrimenti null. */
export function getSeedOverallScoreForUser(userId: string): number | null {
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
  const now = new Date().toISOString();
  getDb().prepare('UPDATE users SET login_count = login_count + 1, last_login_at = ? WHERE id = ?').run(now, userId);
}

export interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
  last_login_at: string | null;
}

export function getUsersWithLoginCounts(): UserWithLoginCount[] {
  ensureDb();
  return getDb().prepare(
    `SELECT id, username, full_name, nickname, COALESCE(login_count, 0) AS login_count, last_login_at
     FROM users
     ORDER BY (last_login_at IS NOT NULL) DESC, last_login_at DESC, full_name`
  ).all() as UserWithLoginCount[];
}

