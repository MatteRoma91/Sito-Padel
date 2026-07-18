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
import { normalizeMatchRow, compareMatchesForDisplay } from './pairs';
import { getPairById } from './pairs';
import { getUsers, getUserById } from './users';

// ============ MATCHES ============

export function getMatches(tournamentId: string): Match[] {
  ensureDb();
  const rows = getDb().prepare('SELECT * FROM matches WHERE tournament_id = ?').all(tournamentId) as Record<string, unknown>[];
  const matches = rows.map(normalizeMatchRow);
  matches.sort(compareMatchesForDisplay);
  return matches;
}

export function getMatchById(id: string): Match | undefined {
  ensureDb();
  const row = getDb().prepare('SELECT * FROM matches WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? normalizeMatchRow(row) : undefined;
}

export function deleteMatches(tournamentId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM matches WHERE tournament_id = ?').run(tournamentId);
}

export function insertMatches(tournamentId: string, matches: Omit<Match, 'id' | 'tournament_id'>[]): void {
  ensureDb();
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO matches (id, tournament_id, round, bracket_type, pair1_id, pair2_id, score_pair1, score_pair2, winner_pair_id, order_in_round, round_number, court_tier, is_final_round)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const m of matches) {
    stmt.run(
      randomUUID(),
      tournamentId,
      m.round,
      m.bracket_type,
      m.pair1_id,
      m.pair2_id,
      m.score_pair1,
      m.score_pair2,
      m.winner_pair_id,
      m.order_in_round,
      m.round_number ?? 0,
      m.court_tier ?? null,
      m.is_final_round ?? 0
    );
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

export function countSaliscendiMatchesAfterRound(tournamentId: string, roundNumber: number): number {
  ensureDb();
  const r = getDb().prepare(
    `SELECT COUNT(*) as c FROM matches WHERE tournament_id = ? AND round = 'saliscendi' AND round_number > ?`
  ).get(tournamentId, roundNumber) as { c: number };
  return r.c;
}

export function setSaliscendiRoundIsFinal(tournamentId: string, roundNumber: number, isFinal: boolean): void {
  ensureDb();
  getDb().prepare(
    `UPDATE matches SET is_final_round = ? WHERE tournament_id = ? AND round = 'saliscendi' AND round_number = ?`
  ).run(isFinal ? 1 : 0, tournamentId, roundNumber);
}

/** Rimuove tutti i match Saliscendi del torneo. */
export function deleteSaliscendiMatches(tournamentId: string): void {
  ensureDb();
  getDb().prepare(`DELETE FROM matches WHERE tournament_id = ? AND round = 'saliscendi'`).run(tournamentId);
}

/** Elimina i match Saliscendi con round_number strettamente maggiore (correzione admin forzata). */
export function deleteSaliscendiMatchesAfterRound(tournamentId: string, roundNumber: number): void {
  ensureDb();
  getDb().prepare(
    `DELETE FROM matches WHERE tournament_id = ? AND round = 'saliscendi' AND round_number > ?`
  ).run(tournamentId, roundNumber);
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

