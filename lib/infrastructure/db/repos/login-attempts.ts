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
  // Usa stringa tra apici singoli: in SQLite "" è un identificatore, non una stringa vuota (la prepare falliva → admin vedeva sempre lista vuota).
  return getDb().prepare(
    "SELECT ip, username, failed_count, locked_until FROM login_attempts WHERE locked_until != '' AND locked_until > ? ORDER BY locked_until DESC"
  ).all(now) as LoginAttempt[];
}

