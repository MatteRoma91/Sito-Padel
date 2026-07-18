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
