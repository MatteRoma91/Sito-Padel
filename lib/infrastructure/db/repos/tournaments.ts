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
import { revertTournamentResultFromOverall } from './users';

// ============ TOURNAMENTS ============

export function getTournaments(): Tournament[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM tournaments ORDER BY date DESC').all() as Tournament[];
}

export function getTournamentById(id: string): Tournament | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Tournament | undefined;
}

export function getTournamentsFuture(): Tournament[] {
  ensureDb();
  return getDb().prepare("SELECT * FROM tournaments WHERE date >= date('now') ORDER BY date ASC").all() as Tournament[];
}

export function getTournamentsPast(): Tournament[] {
  ensureDb();
  return getDb().prepare("SELECT * FROM tournaments WHERE date < date('now') ORDER BY date DESC").all() as Tournament[];
}

export function getTournamentsPastFiltered(filters: { year?: string; month?: string; name?: string }): Tournament[] {
  ensureDb();
  let sql = "SELECT * FROM tournaments WHERE date < date('now')";
  const params: string[] = [];
  if (filters.year) {
    sql += " AND strftime('%Y', date) = ?";
    params.push(filters.year);
  }
  if (filters.month) {
    sql += " AND strftime('%m', date) = ?";
    params.push(filters.month.padStart(2, '0'));
  }
  if (filters.name) {
    sql += " AND name LIKE ?";
    params.push(`%${filters.name}%`);
  }
  sql += " ORDER BY date DESC";
  return getDb().prepare(sql).all(...params) as Tournament[];
}

export function getAllPastTournamentDates(): { date: string }[] {
  ensureDb();
  return getDb().prepare("SELECT DISTINCT date FROM tournaments WHERE date < date('now') ORDER BY date DESC").all() as { date: string }[];
}

export function createTournament(data: {
  name: string;
  date: string;
  time?: string;
  venue?: string;
  category?: TournamentCategory;
  max_players?: number;
  format?: TournamentFormat | null;
  created_by: string;
}): string {
  ensureDb();
  const id = randomUUID();
  const isSal = data.format === 'saliscendi_12' || data.max_players === 12;
  const maxPlayers = data.max_players === 8 ? 8 : isSal ? 12 : 16;
  const format: TournamentFormat | null = isSal ? 'saliscendi_12' : null;
  const category: TournamentCategory =
    maxPlayers === 8
      ? 'brocco_500'
      : data.category === 'grand_slam'
        ? 'grand_slam'
        : 'master_1000';

  getDb().prepare(
    `INSERT INTO tournaments (id, name, date, time, venue, category, max_players, format, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.name, data.date, data.time || null, data.venue || null, category, maxPlayers, format, data.created_by);
  return id;
}

export function createTournamentWithCourtBookings(data: {
  name: string;
  date: string;
  time?: string;
  venue?: string;
  category?: TournamentCategory;
  max_players?: number;
  format?: TournamentFormat | null;
  created_by: string;
  slot_start: string;
  slot_end: string;
  court_ids: string[];
}): string {
  ensureDb();
  const db = getDb();
  const isSal = data.format === 'saliscendi_12' || data.max_players === 12;
  const maxPlayers = data.max_players === 8 ? 8 : isSal ? 12 : 16;
  const format: TournamentFormat | null = isSal ? 'saliscendi_12' : null;
  const category: TournamentCategory =
    maxPlayers === 8
      ? 'brocco_500'
      : data.category === 'grand_slam'
        ? 'grand_slam'
        : 'master_1000';

  const tournamentId = randomUUID();
  const name = (data.name && data.name.trim()) ? data.name.trim() : 'Torneo';

  db.transaction(() => {
    db.prepare(
      `INSERT INTO tournaments (id, name, date, time, venue, category, max_players, format, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(tournamentId, name, data.date, data.time || null, data.venue || null, category, maxPlayers, format, data.created_by);

    const insertBooking = db.prepare(
      `INSERT INTO court_bookings (id, court_id, date, slot_start, slot_end, booking_name, tournament_id, booked_by_user_id, guest_name, guest_phone, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const court_id of data.court_ids) {
      if (!court_id || !court_id.trim()) continue;
      insertBooking.run(
        randomUUID(),
        court_id.trim(),
        data.date,
        data.slot_start,
        data.slot_end,
        name,
        tournamentId,
        null,
        null,
        null,
        data.created_by
      );
    }
  })();

  return tournamentId;
}

export function updateTournament(id: string, data: Partial<Pick<Tournament, 'name' | 'date' | 'time' | 'venue' | 'status' | 'category' | 'max_players' | 'format' | 'completed_at' | 'mvp_deadline' | 'overall_applied_at'>>): void {
  ensureDb();
  const existing = getTournamentById(id);

  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.time !== undefined) { fields.push('time = ?'); values.push(data.time); }
  if (data.venue !== undefined) { fields.push('venue = ?'); values.push(data.venue); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(data.completed_at); }
  if (data.mvp_deadline !== undefined) { fields.push('mvp_deadline = ?'); values.push(data.mvp_deadline); }
  if (data.overall_applied_at !== undefined) { fields.push('overall_applied_at = ?'); values.push(data.overall_applied_at); }

  // Calcola il nuovo max_players (se fornito) o quello esistente
  const effectiveMaxPlayers = data.max_players !== undefined
    ? (data.max_players === 8 ? 8 : data.max_players === 12 ? 12 : 16)
    : (existing?.max_players ?? 16);

  // Gestione categoria: forzata a brocco_500 per tornei da 8 giocatori
  if (data.category !== undefined || effectiveMaxPlayers === 8) {
    const newCategory: TournamentCategory =
      effectiveMaxPlayers === 8
        ? 'brocco_500'
        : data.category === 'grand_slam'
          ? 'grand_slam'
          : (data.category === 'master_1000' ? 'master_1000' : (existing?.category ?? 'master_1000'));

    fields.push('category = ?');
    values.push(newCategory);
  }

  if (data.max_players !== undefined) {
    fields.push('max_players = ?');
    values.push(String(effectiveMaxPlayers));
  }

  if (data.format !== undefined) {
    fields.push('format = ?');
    values.push(data.format);
  } else if (data.max_players !== undefined && effectiveMaxPlayers === 8) {
    fields.push('format = ?');
    values.push(null);
  } else if (data.max_players !== undefined && effectiveMaxPlayers === 12) {
    fields.push('format = ?');
    values.push('saliscendi_12');
  } else if (data.max_players !== undefined && effectiveMaxPlayers === 16) {
    fields.push('format = ?');
    values.push(null);
  }

  if (fields.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE tournaments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteTournament(id: string): void {
  ensureDb();
  revertTournamentResultFromOverall(id);
  getDb().prepare('DELETE FROM tournaments WHERE id = ?').run(id);
  recalculateCumulativeRankings();
}

