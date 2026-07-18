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

