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
import { getTournamentById, updateTournament } from './tournaments';
import { getUsersByIds } from './users';

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

