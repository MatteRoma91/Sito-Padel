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

