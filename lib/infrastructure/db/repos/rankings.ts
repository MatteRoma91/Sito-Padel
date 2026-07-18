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

// ============ RANKINGS ============

export function getTournamentRankings(tournamentId: string): TournamentRanking[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM tournament_rankings WHERE tournament_id = ? ORDER BY position').all(tournamentId) as TournamentRanking[];
}

export function deleteTournamentRankings(tournamentId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM tournament_rankings WHERE tournament_id = ?').run(tournamentId);
}

/** Reset flag ultimo round sui match Saliscendi (solo formato saliscendi). */
export function clearSaliscendiFinalFlags(tournamentId: string): void {
  ensureDb();
  getDb()
    .prepare(
      `UPDATE matches SET is_final_round = 0 WHERE tournament_id = ? AND round = 'saliscendi'`
    )
    .run(tournamentId);
}

/** Rimuove MVP e voti per un torneo (es. riapertura). */
export function deleteMvpDataForTournament(tournamentId: string): void {
  ensureDb();
  const db = getDb();
  db.prepare('DELETE FROM mvp_votes WHERE tournament_id = ?').run(tournamentId);
  db.prepare('DELETE FROM tournament_mvp WHERE tournament_id = ?').run(tournamentId);
}

export function insertTournamentRanking(data: TournamentRanking): void {
  ensureDb();
  getDb().prepare(
    `INSERT INTO tournament_rankings (tournament_id, pair_id, position, points, is_override)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tournament_id, pair_id) DO UPDATE SET position = ?, points = ?, is_override = ?`
  ).run(data.tournament_id, data.pair_id, data.position, data.points, data.is_override, data.position, data.points, data.is_override);
}

