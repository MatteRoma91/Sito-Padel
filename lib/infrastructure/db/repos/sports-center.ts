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

// ============ SPORTS CENTER (courts, bookings, closed slots) ============

export function getCourts(): Court[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM courts').all() as Court[];
}

export function getCourtsOrdered(): Court[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM courts ORDER BY display_order, name').all() as Court[];
}

export function insertCourt(data: { name: string; type: 'indoor' | 'outdoor'; display_order: number }): string {
  ensureDb();
  const id = randomUUID();
  getDb()
    .prepare('INSERT INTO courts (id, name, type, display_order) VALUES (?, ?, ?, ?)')
    .run(id, data.name.trim(), data.type, data.display_order);
  return id;
}

export function updateCourt(id: string, data: { name?: string; type?: 'indoor' | 'outdoor'; display_order?: number }): void {
  ensureDb();
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name.trim());
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.display_order !== undefined) {
    updates.push('display_order = ?');
    values.push(data.display_order);
  }
  if (updates.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE courts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function getCourtById(id: string): Court | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM courts WHERE id = ?').get(id) as Court | undefined;
}

export function hasActiveBookings(courtId: string): boolean {
  ensureDb();
  const row = getDb()
    .prepare('SELECT 1 FROM court_bookings WHERE court_id = ? AND status = ? LIMIT 1')
    .get(courtId, 'confirmed') as { '1'?: number } | undefined;
  return !!row;
}

export function deleteCourtById(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM courts WHERE id = ?').run(id);
}

export function getBookingsByDate(date: string): CourtBooking[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_bookings WHERE date = ? AND status = ? ORDER BY slot_start')
    .all(date, 'confirmed') as CourtBooking[];
}

export function getBookingsByCourtAndDate(courtId: string, date: string): CourtBooking[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_bookings WHERE court_id = ? AND date = ? AND status = ? ORDER BY slot_start')
    .all(courtId, date, 'confirmed') as CourtBooking[];
}

export function getBookingsInDateRange(fromDate: string, toDate: string): CourtBooking[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_bookings WHERE status = ? AND date >= ? AND date <= ? ORDER BY date, slot_start')
    .all('confirmed', fromDate, toDate) as CourtBooking[];
}

export function getBookingById(id: string): CourtBooking | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM court_bookings WHERE id = ?').get(id) as CourtBooking | undefined;
}

export function createBooking(data: {
  court_id: string;
  date: string;
  slot_start: string;
  slot_end: string;
  booking_name: string;
  tournament_id?: string | null;
  booked_by_user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  created_by?: string | null;
  booking_kind?: 'standard' | 'lesson';
}): string {
  ensureDb();
  const id = randomUUID();
  const name = (data.booking_name && data.booking_name.trim()) ? data.booking_name.trim() : 'Prenotazione';
  const kind = data.booking_kind === 'lesson' ? 'lesson' : 'standard';
  getDb()
    .prepare(
      `INSERT INTO court_bookings (id, court_id, date, slot_start, slot_end, booking_name, tournament_id, booked_by_user_id, guest_name, guest_phone, created_by, booking_kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.court_id,
      data.date,
      data.slot_start,
      data.slot_end,
      name,
      data.tournament_id ?? null,
      data.booked_by_user_id ?? null,
      data.guest_name ?? null,
      data.guest_phone ?? null,
      data.created_by ?? null,
      kind
    );
  return id;
}

export class SlotOccupiedError extends Error {
  constructor() {
    super('SLOT_OCCUPIED');
    this.name = 'SlotOccupiedError';
  }
}

/**
 * Inserisce una prenotazione con lock SQLite IMMEDIATE per ridurre race doppia prenotazione.
 */
export function createBookingWithImmediateLock(data: {
  court_id: string;
  date: string;
  slot_start: string;
  slot_end: string;
  booking_name: string;
  tournament_id?: string | null;
  booked_by_user_id?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  created_by?: string | null;
  booking_kind?: 'standard' | 'lesson';
}): string {
  ensureDb();
  const db = getDb();
  const parseTime = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const timeInRange = (start: number, end: number, slotStart: number, slotEnd: number): boolean =>
    start < slotEnd && end > slotStart;

  const txn = db.transaction(() => {
    const startMin = parseTime(data.slot_start);
    const endMin = parseTime(data.slot_end);
    const existing = getBookingsByDate(data.date).filter((b) => b.court_id === data.court_id);
    for (const b of existing) {
      const bStart = parseTime(b.slot_start);
      const bEnd = parseTime(b.slot_end);
      if (timeInRange(startMin, endMin, bStart, bEnd)) {
        throw new SlotOccupiedError();
      }
    }
    return createBooking(data);
  }, { behavior: 'immediate' });
  try {
    return txn();
  } catch (e) {
    if (e instanceof SlotOccupiedError) throw e;
    throw e;
  }
}

export function updateBooking(
  id: string,
  data: {
    booking_name?: string;
    court_id?: string;
    date?: string;
    slot_start?: string;
    slot_end?: string;
    status?: string;
  }
): void {
  ensureDb();
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (data.booking_name !== undefined) {
    updates.push('booking_name = ?');
    values.push(data.booking_name);
  }
  if (data.court_id !== undefined) {
    updates.push('court_id = ?');
    values.push(data.court_id);
  }
  if (data.date !== undefined) {
    updates.push('date = ?');
    values.push(data.date);
  }
  if (data.slot_start !== undefined) {
    updates.push('slot_start = ?');
    values.push(data.slot_start);
  }
  if (data.slot_end !== undefined) {
    updates.push('slot_end = ?');
    values.push(data.slot_end);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (updates.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE court_bookings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function cancelBooking(id: string): void {
  ensureDb();
  getDb().prepare('UPDATE court_bookings SET status = ? WHERE id = ?').run('cancelled', id);
}

/** Elimina fisicamente la prenotazione (es. undo lezione per liberare lo slot). */
export function deleteCourtBookingById(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM court_bookings WHERE id = ?').run(id);
}

export function getBookingParticipants(bookingId: string): CourtBookingParticipant[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM court_booking_participants WHERE booking_id = ? ORDER BY position')
    .all(bookingId) as CourtBookingParticipant[];
}

export type BookingParticipantSlot = {
  user_id?: string | null;
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_phone?: string | null;
};

export function setBookingParticipants(bookingId: string, participants: BookingParticipantSlot[]): void {
  ensureDb();
  const db = getDb();
  db.prepare('DELETE FROM court_booking_participants WHERE booking_id = ?').run(bookingId);
  const insert = db.prepare(
    `INSERT INTO court_booking_participants (id, booking_id, user_id, position, guest_first_name, guest_last_name, guest_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (let position = 1; position <= 4; position++) {
    const slot = participants[position - 1];
    if (!slot) continue;
    const userId = slot.user_id != null && String(slot.user_id).trim() ? String(slot.user_id).trim() : null;
    const gFirst = slot.guest_first_name != null && String(slot.guest_first_name).trim() ? String(slot.guest_first_name).trim() : null;
    const gLast = slot.guest_last_name != null && String(slot.guest_last_name).trim() ? String(slot.guest_last_name).trim() : null;
    const gPhone = slot.guest_phone != null && String(slot.guest_phone).trim() ? String(slot.guest_phone).trim() : null;
    if (userId) {
      insert.run(randomUUID(), bookingId, userId, position, null, null, null);
    } else if (gFirst && gLast) {
      insert.run(randomUUID(), bookingId, null, position, gFirst, gLast, gPhone);
    }
  }
}

export function getMatchByBookingId(bookingId: string): CourtBookingMatch | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM court_booking_matches WHERE booking_id = ?').get(bookingId) as CourtBookingMatch | undefined;
}

export function createMatchForBooking(bookingId: string): void {
  ensureDb();
  const existing = getMatchByBookingId(bookingId);
  if (existing) return;
  const id = randomUUID();
  getDb()
    .prepare('INSERT INTO court_booking_matches (id, booking_id, created_at) VALUES (?, ?, datetime(\'now\'))')
    .run(id, bookingId);
}

export function updateCourtBookingMatchResult(
  bookingId: string,
  data: {
    result_winner: 1 | 2;
    result_set1_c1: number;
    result_set1_c2: number;
    result_set2_c1: number;
    result_set2_c2: number;
    result_set3_c1?: number;
    result_set3_c2?: number;
  }
): void {
  ensureDb();
  const updates: string[] = [
    'result_winner = ?',
    'result_set1_c1 = ?', 'result_set1_c2 = ?',
    'result_set2_c1 = ?', 'result_set2_c2 = ?',
    'result_set3_c1 = ?', 'result_set3_c2 = ?',
    'result_entered_at = datetime(\'now\')',
  ];
  const values: (number | null)[] = [
    data.result_winner,
    data.result_set1_c1, data.result_set1_c2,
    data.result_set2_c1, data.result_set2_c2,
    data.result_set3_c1 ?? null, data.result_set3_c2 ?? null,
  ];
  getDb()
    .prepare(`UPDATE court_booking_matches SET ${updates.join(', ')} WHERE booking_id = ?`)
    .run(...values, bookingId);
}

export function deleteMatchByBookingId(bookingId: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM court_booking_matches WHERE booking_id = ?').run(bookingId);
}

export function getClosedSlotsByDay(dayOfWeek: number): CenterClosedSlot[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM center_closed_slots WHERE day_of_week = ? ORDER BY slot_start')
    .all(dayOfWeek) as CenterClosedSlot[];
}

export function getAllClosedSlots(): CenterClosedSlot[] {
  ensureDb();
  return getDb().prepare('SELECT * FROM center_closed_slots ORDER BY day_of_week, slot_start').all() as CenterClosedSlot[];
}

export function insertClosedSlot(data: { day_of_week: number; slot_start: string; slot_end: string }): string {
  ensureDb();
  const id = randomUUID();
  getDb()
    .prepare('INSERT INTO center_closed_slots (id, day_of_week, slot_start, slot_end) VALUES (?, ?, ?, ?)')
    .run(id, data.day_of_week, data.slot_start, data.slot_end);
  return id;
}

export function deleteClosedSlot(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM center_closed_slots WHERE id = ?').run(id);
}

