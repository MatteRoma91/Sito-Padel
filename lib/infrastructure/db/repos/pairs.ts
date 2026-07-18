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
import { getMatches } from './matches';

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

export function updatePairsPlayersBatch(
  updates: { pairId: string; player1Id: string; player2Id: string }[]
): void {
  ensureDb();
  if (updates.length === 0) return;

  const db = getDb();
  const stmt = db.prepare('UPDATE pairs SET player1_id = ?, player2_id = ? WHERE id = ?');
  const tx = db.transaction((rows: { pairId: string; player1Id: string; player2Id: string }[]) => {
    for (const row of rows) {
      stmt.run(row.player1Id, row.player2Id, row.pairId);
    }
  });
  tx(updates);
}

export function getDecidedMatchCountByPair(tournamentId: string): Map<string, number> {
  const counts = new Map<string, number>();
  const matches = getMatches(tournamentId);

  for (const match of matches) {
    if (!match.winner_pair_id) continue;
    if (match.pair1_id) {
      counts.set(match.pair1_id, (counts.get(match.pair1_id) || 0) + 1);
    }
    if (match.pair2_id) {
      counts.set(match.pair2_id, (counts.get(match.pair2_id) || 0) + 1);
    }
  }

  return counts;
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

/**
 * ID dei tornei passati rispetto a excludeTournamentId (data strettamente minore),
 * ordinati dal più recente al più vecchio. Tie-break deterministico su id.
 */
export function getPastTournamentIdsBeforeCurrent(excludeTournamentId: string, limit: number): string[] {
  ensureDb();
  const db = getDb();
  const current = db.prepare('SELECT date FROM tournaments WHERE id = ?').get(excludeTournamentId) as { date: string } | undefined;
  const currentDate = current?.date ?? '9999-12-31';
  const rows = db
    .prepare(
      `SELECT id FROM tournaments WHERE id != ? AND date < ? ORDER BY date DESC, id DESC LIMIT ?`
    )
    .all(excludeTournamentId, currentDate, limit) as { id: string }[];
  return rows.map((r) => r.id);
}

/** Unisce le coppie (player1, player2) in una mappa simmetrica userId -> Set(partnerId). */
export function getPartnerPairsFromTournamentIds(tournamentIds: string[]): Map<string, Set<string>> {
  const partnerMap = new Map<string, Set<string>>();
  if (tournamentIds.length === 0) {
    return partnerMap;
  }
  ensureDb();
  const placeholders = tournamentIds.map(() => '?').join(',');
  const rows = getDb()
    .prepare(`SELECT player1_id, player2_id FROM pairs WHERE tournament_id IN (${placeholders})`)
    .all(...tournamentIds) as { player1_id: string; player2_id: string }[];

  for (const row of rows) {
    const a = row.player1_id;
    const b = row.player2_id;
    if (!partnerMap.has(a)) partnerMap.set(a, new Set());
    if (!partnerMap.has(b)) partnerMap.set(b, new Set());
    partnerMap.get(a)!.add(b);
    partnerMap.get(b)!.add(a);
  }
  return partnerMap;
}

/**
 * Partner nel torneo passato immediatamente precedente (per data, poi id) rispetto al torneo indicato.
 */
export function getImmediatePreviousTournamentPartnerPairs(excludeTournamentId: string): Map<string, Set<string>> {
  const ids = getPastTournamentIdsBeforeCurrent(excludeTournamentId, 1);
  return getPartnerPairsFromTournamentIds(ids);
}

/**
 * Partner nei tornei dalla 2ª alla 5ª posizione nella cronologia passata (esclude il più recente),
 * per la preferenza soft in estrazione.
 */
export function getOlderRecentPartnerPairs(excludeTournamentId: string): Map<string, Set<string>> {
  const ids = getPastTournamentIdsBeforeCurrent(excludeTournamentId, 5);
  return getPartnerPairsFromTournamentIds(ids.slice(1));
}

/**
 * Restituisce le coppie (player1_id, player2_id) dai tornei più recenti già disputati,
 * escludendo il torneo indicato. Usato per evitare di ripetere le stesse coppie.
 * Considera solo tornei con data < data del torneo corrente (tornei passati).
 * @param excludeTournamentId ID del torneo da escludere (es. quello in corso di estrazione)
 * @param lastN numero di tornei da considerare (default 5)
 */
export function getRecentPartnerPairs(
  excludeTournamentId: string,
  lastN = 5
): Map<string, Set<string>> {
  const ids = getPastTournamentIdsBeforeCurrent(excludeTournamentId, lastN);
  return getPartnerPairsFromTournamentIds(ids);
}

export function normalizeMatchRow(r: Record<string, unknown>): Match {
  const m = r as unknown as Match;
  return {
    ...m,
    round_number: typeof r.round_number === 'number' ? r.round_number : Number(r.round_number ?? 0),
    court_tier: (r.court_tier as Match['court_tier']) ?? null,
    is_final_round: typeof r.is_final_round === 'number' ? r.is_final_round : Number(r.is_final_round ?? 0),
  };
}

export function compareMatchesForDisplay(a: Match, b: Match): number {
  const salA = a.round === 'saliscendi' ? 1 : 0;
  const salB = b.round === 'saliscendi' ? 1 : 0;
  if (salA !== salB) return salA - salB;
  if (salA === 1) {
    const ra = a.round_number ?? 0;
    const rb = b.round_number ?? 0;
    if (ra !== rb) return ra - rb;
    return (a.order_in_round ?? 0) - (b.order_in_round ?? 0);
  }
  const bt = (a.bracket_type || '').localeCompare(b.bracket_type || '');
  if (bt !== 0) return bt;
  const rr = String(a.round).localeCompare(String(b.round));
  if (rr !== 0) return rr;
  return (a.order_in_round ?? 0) - (b.order_in_round ?? 0);
}

