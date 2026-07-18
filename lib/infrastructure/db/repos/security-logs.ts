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

// ============ SECURITY LOGS ============

export type SecurityLogType = 'login_failed' | 'auth_401' | 'auth_403' | 'admin_access' | 'lesson_event';

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

