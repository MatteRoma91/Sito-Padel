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
import { CHART_START_DATE, getSeedOverallScoreForUser, computeTournamentOverallDeltas } from './users';
import { getMatches } from './matches';
import { getPairs } from './pairs';
import { getTournamentRankings } from './rankings';
import { getTournaments } from './tournaments';

// ============ HISTORY FOR CHARTS ============

export interface OverallScoreHistoryEntry {
  date: string;
  overall_score: number;
}

export interface PointsHistoryEntry {
  date: string;
  cumulative_points: number;
}

/** Tornei in cui l'utente ha partecipato (è in una coppia), ordinati per data ASC. */
function getTournamentsForUserChronologically(userId: string): Tournament[] {
  ensureDb();
  const pairs = getDb().prepare('SELECT tournament_id FROM pairs WHERE player1_id = ? OR player2_id = ?').all(userId, userId) as { tournament_id: string }[];
  const tournamentIds = Array.from(new Set(pairs.map((p) => p.tournament_id)));
  if (tournamentIds.length === 0) return [];
  const all = getTournaments();
  const byId = new Map(all.map((t) => [t.id, t]));
  const list = tournamentIds.map((id) => byId.get(id)).filter(Boolean) as Tournament[];
  list.sort((a, b) => a.date.localeCompare(b.date));
  return list;
}

/**
 * Storico overall: inizio 1 gen 2025 (seed o 50), poi aggiornamento per ogni torneo
 * completato. Usa la stessa funzione di computeTournamentOverallDeltas così il grafico
 * è sempre allineato al punteggio in anagrafica.
 */
export function getOverallScoreHistory(userId: string): OverallScoreHistoryEntry[] {
  ensureDb();
  const allTournaments = getTournamentsForUserChronologically(userId);
  // Solo tornei completati con data >= baseline (stesso criterio del consolidamento DB)
  const tournaments = allTournaments.filter(
    (t) => t.status === 'completed' && t.date >= CHART_START_DATE
  );
  const initialScore = getSeedOverallScoreForUser(userId) ?? 50;
  const result: OverallScoreHistoryEntry[] = [{ date: CHART_START_DATE, overall_score: initialScore }];
  let score = initialScore;

  for (const t of tournaments) {
    const deltas = computeTournamentOverallDeltas(t.id);
    const delta = deltas.get(userId) ?? 0;
    if (delta === 0) continue;
    score = Math.max(0, Math.min(100, score + delta));
    result.push({ date: t.date, overall_score: score });
  }

  return result;
}

/** Storico punti ATP cumulativi: inizio 1 gen 2025 con 0, poi un punto per ogni torneo completato (data >= 2025-01-01). */
export function getPointsHistory(userId: string): PointsHistoryEntry[] {
  ensureDb();
  const allTournaments = getTournamentsForUserChronologically(userId);
  const tournaments = allTournaments.filter((t) => t.date >= CHART_START_DATE);
  const result: PointsHistoryEntry[] = [{ date: CHART_START_DATE, cumulative_points: 0 }];
  let cumulative = 0;

  for (const t of tournaments) {
    const pairs = getPairs(t.id);
    const userPair = pairs.find((p) => p.player1_id === userId || p.player2_id === userId);
    if (!userPair) continue;

    const rankings = getTournamentRankings(t.id);
    const row = rankings.find((r) => r.pair_id === userPair.id);
    const points = row?.points ?? 0;
    cumulative += points;
    result.push({ date: t.date, cumulative_points: cumulative });
  }
  return result;
}

