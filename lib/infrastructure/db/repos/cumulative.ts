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

// ============ CUMULATIVE RANKINGS ============

export function getCumulativeRankings(): CumulativeRanking[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM cumulative_rankings ORDER BY total_points DESC').all() as CumulativeRanking[];
}

export function getCumulativeByUserIds(userIds: string[]): CumulativeRanking[] {
  ensureDb();
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  return getDb().prepare(`SELECT * FROM cumulative_rankings WHERE user_id IN (${placeholders})`).all(...userIds) as CumulativeRanking[];
}

export function upsertCumulativeRanking(userId: string, totalPoints: number, isOverride: boolean): void {
  ensureDb();
  getDb().prepare(
    `INSERT INTO cumulative_rankings (user_id, total_points, is_override, gold_medals, silver_medals, bronze_medals, wooden_spoons)
     VALUES (?, ?, ?, 0, 0, 0, 0)
     ON CONFLICT(user_id) DO UPDATE SET total_points = ?, is_override = ?`
  ).run(userId, totalPoints, isOverride ? 1 : 0, totalPoints, isOverride ? 1 : 0);
}

export function recalculateCumulativeRankings(): void {
  ensureDb();
  const db = getDb();
  
  // Prende tutti i punti dei giocatori dai ranking dei tornei
  const points = db.prepare(`
    SELECT u.id as user_id, COALESCE(SUM(tr.points), 0) as total
    FROM users u
    LEFT JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    LEFT JOIN tournament_rankings tr ON tr.pair_id = p.id
    GROUP BY u.id
  `).all() as { user_id: string; total: number }[];

  // Calcola medaglie per ogni giocatore
  // Gold: posizione 1
  const goldMedals = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    WHERE tr.position = 1
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // Silver: posizione 2
  const silverMedals = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    WHERE tr.position = 2
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // Bronze: posizione 3
  const bronzeMedals = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    WHERE tr.position = 3
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // Wooden spoon: ultima posizione per formato torneo
  const woodenSpoons = db.prepare(`
    SELECT u.id as user_id, COUNT(*) as count
    FROM users u
    JOIN pairs p ON (p.player1_id = u.id OR p.player2_id = u.id)
    JOIN tournament_rankings tr ON tr.pair_id = p.id
    JOIN tournaments t ON t.id = tr.tournament_id
    WHERE (t.max_players = 8 AND tr.position = 4)
       OR (t.max_players = 16 AND IFNULL(t.format, '') != 'saliscendi_12' AND tr.position = 8)
       OR ((t.format = 'saliscendi_12' OR t.max_players = 12) AND tr.position = 6)
    GROUP BY u.id
  `).all() as { user_id: string; count: number }[];

  // MVP: da tournament_mvp (escludi righe con mvp_user_id NULL)
  const mvpCounts = db.prepare(`
    SELECT mvp_user_id as user_id, COUNT(*) as count
    FROM tournament_mvp
    WHERE mvp_user_id IS NOT NULL AND mvp_user_id != ''
    GROUP BY mvp_user_id
  `).all() as { user_id: string; count: number }[];

  // Crea mappe per accesso rapido
  const goldMap = new Map(goldMedals.map(m => [m.user_id, m.count]));
  const silverMap = new Map(silverMedals.map(m => [m.user_id, m.count]));
  const bronzeMap = new Map(bronzeMedals.map(m => [m.user_id, m.count]));
  const spoonMap = new Map(woodenSpoons.map(m => [m.user_id, m.count]));
  const mvpMap = new Map(mvpCounts.map(m => [m.user_id, m.count]));

  // Aggiorna tutti i record (solo quelli non in override per i punti)
  const stmt = db.prepare(
    `INSERT INTO cumulative_rankings (user_id, total_points, is_override, gold_medals, silver_medals, bronze_medals, wooden_spoons, mvp_count)
     VALUES (?, ?, 0, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET 
       total_points = CASE WHEN is_override = 0 THEN ? ELSE total_points END,
       gold_medals = ?,
       silver_medals = ?,
       bronze_medals = ?,
       wooden_spoons = ?,
       mvp_count = ?`
  );

  for (const p of points) {
    const gold = goldMap.get(p.user_id) || 0;
    const silver = silverMap.get(p.user_id) || 0;
    const bronze = bronzeMap.get(p.user_id) || 0;
    const spoon = spoonMap.get(p.user_id) || 0;
    const mvp = mvpMap.get(p.user_id) || 0;
    stmt.run(p.user_id, p.total, gold, silver, bronze, spoon, mvp, p.total, gold, silver, bronze, spoon, mvp);
  }
}

