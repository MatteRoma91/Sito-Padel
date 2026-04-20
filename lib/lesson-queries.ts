import { randomUUID } from 'crypto';
import { getDb } from './db/db';
import {
  ensureDb,
  createBooking,
  getBookingsByDate,
  getCourtById,
  setBookingParticipants,
  deleteCourtBookingById,
  getAllClosedSlots,
  getSiteConfig,
  logSecurityEvent,
  getUserById,
} from './db/queries';
import type {
  User,
  LessonEntitlement,
  LessonConsumption,
  LessonRequest,
  LessonEntitlementKind,
  BookingParticipantSlot,
} from './types';

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addOneHour(slotStart: string): string {
  return formatTime(parseTime(slotStart) + 60);
}

function timeRangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function getMaestroUsers(): User[] {
  ensureDb();
  return getDb()
    .prepare(`SELECT * FROM users WHERE role = 'maestro' ORDER BY COALESCE(nickname, full_name, username)`)
    .all() as User[];
}

export function countMaestroUsers(): number {
  ensureDb();
  const row = getDb()
    .prepare(`SELECT COUNT(*) as c FROM users WHERE role = ?`)
    .get('maestro') as { c: number };
  return row?.c ?? 0;
}

export function assertSlotFreeForLesson(
  courtId: string,
  date: string,
  slotStart: string,
  slotEnd: string
): { ok: true } | { ok: false; error: string } {
  const startMin = parseTime(slotStart);
  const endMin = parseTime(slotEnd);
  if (endMin - startMin !== 60) {
    return { ok: false, error: 'La lezione deve durare esattamente 60 minuti' };
  }

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const closedSlots = getAllClosedSlots().filter((s) => s.day_of_week === dayOfWeek);
  for (const closed of closedSlots) {
    const cStart = parseTime(closed.slot_start);
    const cEnd = parseTime(closed.slot_end);
    if (timeRangesOverlap(startMin, endMin, cStart, cEnd)) {
      return { ok: false, error: 'Lo slot ricade in un orario di chiusura del centro' };
    }
  }

  const config = getSiteConfig();
  const openStr = config.court_open_time ?? '08:00';
  const closeStr = config.court_close_time ?? '23:00';
  const openMin = parseTime(openStr);
  const closeMin = parseTime(closeStr);
  if (startMin < openMin || endMin > closeMin) {
    return { ok: false, error: 'La lezione deve essere dentro gli orari di apertura del centro' };
  }

  const court = getCourtById(courtId);
  if (!court) return { ok: false, error: 'Campo non trovato' };

  const existing = getBookingsByDate(date).filter((b) => b.court_id === courtId && b.status === 'confirmed');
  for (const b of existing) {
    const bStart = parseTime(b.slot_start);
    const bEnd = parseTime(b.slot_end);
    if (timeRangesOverlap(startMin, endMin, bStart, bEnd)) {
      return { ok: false, error: 'Lo slot è già occupato' };
    }
  }

  return { ok: true };
}

export function getLessonEntitlementById(id: string): LessonEntitlement | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM lesson_entitlements WHERE id = ?').get(id) as LessonEntitlement | undefined;
}

export function createLessonEntitlement(data: {
  kind: LessonEntitlementKind;
  primaryUserId: string;
  partnerUserId?: string | null;
  assignedByUserId: string;
}): string {
  ensureDb();
  const id = randomUUID();
  if (data.kind === 'pair') {
    if (!data.partnerUserId || data.partnerUserId === data.primaryUserId) {
      throw new Error('Carnet coppia: serve un secondo giocatore distinto');
    }
  }
  getDb()
    .prepare(
      `INSERT INTO lesson_entitlements (id, kind, lessons_total, lessons_used, primary_user_id, partner_user_id, assigned_by_user_id)
       VALUES (?, ?, 5, 0, ?, ?, ?)`
    )
    .run(id, data.kind, data.primaryUserId, data.kind === 'pair' ? data.partnerUserId : null, data.assignedByUserId);
  return id;
}

export function deleteLessonEntitlement(id: string): void {
  ensureDb();
  getDb().prepare('DELETE FROM lesson_entitlements WHERE id = ?').run(id);
}

export type LessonEntitlementRow = LessonEntitlement & {
  primary_name: string | null;
  partner_name: string | null;
  assigned_by_name: string | null;
};

function mapEntitlementRow(row: Record<string, unknown>): LessonEntitlementRow {
  const {
    primary_display,
    partner_display,
    assigned_display,
    ...rest
  } = row;
  const e = rest as unknown as LessonEntitlement;
  return {
    ...e,
    primary_name: (primary_display as string) || null,
    partner_name: e.partner_user_id ? ((partner_display as string) || null) : null,
    assigned_by_name: (assigned_display as string) || null,
  };
}

export function listLessonEntitlementsForStaff(): LessonEntitlementRow[] {
  ensureDb();
  const rows = getDb()
    .prepare(
      `SELECT e.*,
        TRIM(COALESCE(pu.nickname, pu.full_name, pu.username)) as primary_display,
        TRIM(COALESCE(pt.nickname, pt.full_name, pt.username)) as partner_display,
        TRIM(COALESCE(ab.nickname, ab.full_name, ab.username)) as assigned_display
       FROM lesson_entitlements e
       JOIN users pu ON pu.id = e.primary_user_id
       LEFT JOIN users pt ON pt.id = e.partner_user_id
       JOIN users ab ON ab.id = e.assigned_by_user_id
       ORDER BY e.created_at DESC`
    )
    .all() as Record<string, unknown>[];
  return rows.map(mapEntitlementRow);
}

export function listLessonEntitlementsForPlayer(userId: string): LessonEntitlementRow[] {
  ensureDb();
  const rows = getDb()
    .prepare(
      `SELECT e.*,
        TRIM(COALESCE(pu.nickname, pu.full_name, pu.username)) as primary_display,
        TRIM(COALESCE(pt.nickname, pt.full_name, pt.username)) as partner_display,
        TRIM(COALESCE(ab.nickname, ab.full_name, ab.username)) as assigned_display
       FROM lesson_entitlements e
       JOIN users pu ON pu.id = e.primary_user_id
       LEFT JOIN users pt ON pt.id = e.partner_user_id
       JOIN users ab ON ab.id = e.assigned_by_user_id
       WHERE e.primary_user_id = ? OR e.partner_user_id = ?
       ORDER BY e.created_at DESC`
    )
    .all(userId, userId) as Record<string, unknown>[];
  return rows.map(mapEntitlementRow);
}

export function listConsumptionsForEntitlement(entitlementId: string): LessonConsumption[] {
  ensureDb();
  return getDb()
    .prepare('SELECT * FROM lesson_consumptions WHERE entitlement_id = ? ORDER BY consumed_at DESC, id DESC')
    .all(entitlementId) as LessonConsumption[];
}

export function createLessonRequest(data: {
  entitlementId: string;
  requesterUserId: string;
  preferredStartIso: string;
}): string {
  ensureDb();
  const ent = getLessonEntitlementById(data.entitlementId);
  if (!ent) throw new Error('Carnet non trovato');
  if (ent.lessons_used >= ent.lessons_total) throw new Error('Carnet esaurito');
  if (data.requesterUserId !== ent.primary_user_id && data.requesterUserId !== ent.partner_user_id) {
    throw new Error('Richiesta non consentita per questo carnet');
  }
  if (ent.kind === 'pair' && !ent.partner_user_id) throw new Error('Carnet coppia incompleto');
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO lesson_requests (id, entitlement_id, requester_user_id, preferred_start, status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
    .run(id, data.entitlementId, data.requesterUserId, data.preferredStartIso);
  return id;
}

export function cancelLessonRequestByUser(requestId: string, userId: string): boolean {
  ensureDb();
  const row = getDb()
    .prepare('SELECT * FROM lesson_requests WHERE id = ? AND requester_user_id = ? AND status = ?')
    .get(requestId, userId, 'pending') as LessonRequest | undefined;
  if (!row) return false;
  getDb().prepare(`UPDATE lesson_requests SET status = 'cancelled' WHERE id = ?`).run(requestId);
  return true;
}

export function getLessonRequestById(id: string): LessonRequest | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM lesson_requests WHERE id = ?').get(id) as LessonRequest | undefined;
}

export type LessonRequestRow = LessonRequest & {
  entitlement_kind: string;
  primary_user_id: string;
  partner_user_id: string | null;
  requester_name: string | null;
};

export function listLessonRequestsForStaff(status?: LessonRequest['status']): LessonRequestRow[] {
  ensureDb();
  const sql =
    status != null
      ? `SELECT r.*, e.kind as entitlement_kind, e.primary_user_id, e.partner_user_id,
          u.nickname as req_nick, u.full_name as req_fn
         FROM lesson_requests r
         JOIN lesson_entitlements e ON e.id = r.entitlement_id
         JOIN users u ON u.id = r.requester_user_id
         WHERE r.status = ?
         ORDER BY r.created_at DESC`
      : `SELECT r.*, e.kind as entitlement_kind, e.primary_user_id, e.partner_user_id,
          u.nickname as req_nick, u.full_name as req_fn
         FROM lesson_requests r
         JOIN lesson_entitlements e ON e.id = r.entitlement_id
         JOIN users u ON u.id = r.requester_user_id
         ORDER BY r.created_at DESC`;
  const rows = status != null ? getDb().prepare(sql).all(status) : getDb().prepare(sql).all();
  return (rows as Record<string, unknown>[]).map((row) => ({
    ...(row as unknown as LessonRequest),
    requester_name: (row.req_nick as string) || (row.req_fn as string) || null,
  })) as LessonRequestRow[];
}

export function listLessonRequestsForUser(userId: string): LessonRequestRow[] {
  ensureDb();
  const rows = getDb()
    .prepare(
      `SELECT r.*, e.kind as entitlement_kind, e.primary_user_id, e.partner_user_id,
        u.nickname as req_nick, u.full_name as req_fn
       FROM lesson_requests r
       JOIN lesson_entitlements e ON e.id = r.entitlement_id
       JOIN users u ON u.id = r.requester_user_id
       WHERE r.requester_user_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(userId) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...(row as unknown as LessonRequest),
    requester_name: (row.req_nick as string) || (row.req_fn as string) || null,
  })) as LessonRequestRow[];
}

function insertConsumptionRow(data: {
  entitlementId: string;
  consumedAt: string;
  maestroUserId: string | null;
  notes: string | null;
  courtBookingId: string | null;
  manualReason: string | null;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO lesson_consumptions (id, entitlement_id, consumed_at, maestro_user_id, notes, court_booking_id, manual_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.entitlementId,
      data.consumedAt,
      data.maestroUserId,
      data.notes,
      data.courtBookingId,
      data.manualReason
    );
  return id;
}

function incrementLessonsUsed(entitlementId: string): void {
  getDb()
    .prepare('UPDATE lesson_entitlements SET lessons_used = lessons_used + 1 WHERE id = ?').run(entitlementId);
}

function logLesson(action: string, details: Record<string, unknown>) {
  logSecurityEvent({
    type: 'lesson_event',
    details: JSON.stringify({ action, ...details }),
  });
}

export function consumeLessonManual(params: {
  entitlementId: string;
  consumedAtIso: string;
  maestroUserId: string | null;
  manualReason: string;
  notes?: string | null;
  actorId: string;
}): { consumptionId: string } {
  ensureDb();
  const ent = getLessonEntitlementById(params.entitlementId);
  if (!ent) throw new Error('Carnet non trovato');
  if (ent.lessons_used >= ent.lessons_total) throw new Error('Carnet esaurito');
  if (params.maestroUserId) {
    const m = getUserById(params.maestroUserId);
    if (!m || m.role !== 'maestro') throw new Error('Maestro non valido');
  }

  const consumptionId = insertConsumptionRow({
    entitlementId: params.entitlementId,
    consumedAt: params.consumedAtIso,
    maestroUserId: params.maestroUserId,
    notes: params.notes ?? null,
    courtBookingId: null,
    manualReason: params.manualReason.trim(),
  });
  incrementLessonsUsed(params.entitlementId);
  logLesson('manual_consume', { entitlementId: params.entitlementId, consumptionId, actorId: params.actorId });
  return { consumptionId };
}

export function approveLessonRequest(params: {
  requestId: string;
  courtId: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  maestroUserId: string;
  reviewedByUserId: string;
}): { bookingId: string; consumptionId: string } {
  ensureDb();
  const req = getLessonRequestById(params.requestId);
  if (!req || req.status !== 'pending') throw new Error('Richiesta non valida');

  const ent = getLessonEntitlementById(req.entitlement_id);
  if (!ent || ent.lessons_used >= ent.lessons_total) throw new Error('Carnet non trovato o esaurito');

  const slotCheck = assertSlotFreeForLesson(params.courtId, params.date, params.slotStart, params.slotEnd);
  if (!slotCheck.ok) throw new Error(slotCheck.error);

  const maestro = getUserById(params.maestroUserId);
  if (!maestro || maestro.role !== 'maestro') throw new Error('Maestro non valido');

  const consumedAt = new Date(params.date + 'T' + params.slotStart + ':00').toISOString();

  const db = getDb();
  const tx = db.transaction(() => {
    const bookingId = createBooking({
      court_id: params.courtId,
      date: params.date,
      slot_start: params.slotStart,
      slot_end: params.slotEnd,
      booking_name: `Lezione — ${maestro.nickname || maestro.full_name || maestro.username}`,
      booked_by_user_id: req.requester_user_id,
      created_by: params.reviewedByUserId,
      booking_kind: 'lesson',
    });

    const participants: BookingParticipantSlot[] = [];
    participants[0] = { user_id: params.maestroUserId };
    participants[1] = { user_id: ent.primary_user_id };
    if (ent.kind === 'pair' && ent.partner_user_id) {
      participants[2] = { user_id: ent.partner_user_id };
    }
    setBookingParticipants(bookingId, participants);

    const consumptionId = insertConsumptionRow({
      entitlementId: ent.id,
      consumedAt,
      maestroUserId: params.maestroUserId,
      notes: null,
      courtBookingId: bookingId,
      manualReason: null,
    });
    incrementLessonsUsed(ent.id);

    db.prepare(
      `UPDATE lesson_requests SET status = 'approved', court_booking_id = ?, reviewed_by_user_id = ?, reviewed_at = datetime('now') WHERE id = ?`
    ).run(bookingId, params.reviewedByUserId, params.requestId);

    return { bookingId, consumptionId };
  });

  const result = tx();
  logLesson('approve_request', { requestId: params.requestId, bookingId: result.bookingId, entitlementId: ent.id });
  return result;
}

export function rejectLessonRequest(requestId: string, reviewedByUserId: string, reason?: string | null): void {
  ensureDb();
  getDb()
    .prepare(
      `UPDATE lesson_requests SET status = 'rejected', reviewed_by_user_id = ?, reviewed_at = datetime('now'), rejection_reason = ? WHERE id = ? AND status = 'pending'`
    )
    .run(reviewedByUserId, reason?.trim() || null, requestId);
  logLesson('reject_request', { requestId, reviewedByUserId });
}

export function createDirectLessonSession(params: {
  entitlementId: string;
  courtId: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  maestroUserId: string;
  createdByUserId: string;
}): { bookingId: string; consumptionId: string } {
  ensureDb();
  const ent = getLessonEntitlementById(params.entitlementId);
  if (!ent || ent.lessons_used >= ent.lessons_total) throw new Error('Carnet non trovato o esaurito');

  const slotCheck = assertSlotFreeForLesson(params.courtId, params.date, params.slotStart, params.slotEnd);
  if (!slotCheck.ok) throw new Error(slotCheck.error);

  const maestro = getUserById(params.maestroUserId);
  if (!maestro || maestro.role !== 'maestro') throw new Error('Maestro non valido');

  const consumedAt = new Date(params.date + 'T' + params.slotStart + ':00').toISOString();

  const db = getDb();
  const result = db.transaction(() => {
    const bookingId = createBooking({
      court_id: params.courtId,
      date: params.date,
      slot_start: params.slotStart,
      slot_end: params.slotEnd,
      booking_name: `Lezione — ${maestro.nickname || maestro.full_name || maestro.username}`,
      booked_by_user_id: ent.primary_user_id,
      created_by: params.createdByUserId,
      booking_kind: 'lesson',
    });

    const participants: BookingParticipantSlot[] = [];
    participants[0] = { user_id: params.maestroUserId };
    participants[1] = { user_id: ent.primary_user_id };
    if (ent.kind === 'pair' && ent.partner_user_id) {
      participants[2] = { user_id: ent.partner_user_id };
    }
    setBookingParticipants(bookingId, participants);

    const consumptionId = insertConsumptionRow({
      entitlementId: ent.id,
      consumedAt,
      maestroUserId: params.maestroUserId,
      notes: null,
      courtBookingId: bookingId,
      manualReason: null,
    });
    incrementLessonsUsed(ent.id);
    return { bookingId, consumptionId };
  })();

  logLesson('direct_lesson', { entitlementId: ent.id, bookingId: result.bookingId });
  return result;
}

export function undoLastLessonConsumption(params: {
  entitlementId: string;
}): { removedBookingId: string | null } {
  ensureDb();
  const ent = getLessonEntitlementById(params.entitlementId);
  if (!ent || ent.lessons_used <= 0) throw new Error('Nessun consumo da annullare');

  const last = getDb()
    .prepare(
      'SELECT * FROM lesson_consumptions WHERE entitlement_id = ? ORDER BY consumed_at DESC, id DESC LIMIT 1'
    )
    .get(params.entitlementId) as LessonConsumption | undefined;
  if (!last) throw new Error('Nessun consumo da annullare');

  const bookingId = last.court_booking_id;

  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM lesson_consumptions WHERE id = ?').run(last.id);
    db.prepare('UPDATE lesson_entitlements SET lessons_used = lessons_used - 1 WHERE id = ? AND lessons_used > 0').run(params.entitlementId);
    if (bookingId) {
      deleteCourtBookingById(bookingId);
    }
  })();

  logLesson('undo_last', { entitlementId: params.entitlementId, consumptionId: last.id });
  return { removedBookingId: bookingId };
}
