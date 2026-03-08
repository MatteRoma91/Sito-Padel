import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getBookingById,
  updateBooking,
  cancelBooking,
  getBookingsByDate,
  getAllClosedSlots,
  getSiteConfig,
  getBookingParticipants,
  setBookingParticipants,
  getMatchByBookingId,
  createMatchForBooking,
  getUsers,
  getCourtsOrdered,
} from '@/lib/db/queries';

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function timeInRange(start: number, end: number, slotStart: number, slotEnd: number): boolean {
  return start < slotEnd && end > slotStart;
}

function getAllowedDurations(config: Record<string, string>): number[] {
  const raw = config.court_allowed_durations ?? '60,90';
  return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n === 60 || n === 90);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { id } = await params;
  const booking = getBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
  }

  const participants = getBookingParticipants(id);
  const userIds = participants.map((p) => p.user_id).filter((id): id is string => id != null);
  const users = getUsers().filter((u) => userIds.includes(u.id));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const participantsWithUser = participants.map((p) => ({
    position: p.position,
    user_id: p.user_id,
    user: p.user_id && userMap[p.user_id]
      ? {
          id: userMap[p.user_id].id,
          nickname: userMap[p.user_id].nickname,
          full_name: userMap[p.user_id].full_name,
          username: userMap[p.user_id].username,
        }
      : null,
    guest_first_name: p.guest_first_name ?? null,
    guest_last_name: p.guest_last_name ?? null,
    guest_phone: p.guest_phone ?? null,
  }));

  const match = getMatchByBookingId(id) ?? null;
  return NextResponse.json({ booking, participants: participantsWithUser, match });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(user)) {
    return NextResponse.json({ error: 'Utente in sola lettura' }, { status: 403 });
  }

  const booking = getBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
  }

  const isAdmin = user.role === 'admin';
  const isOwn = booking.booked_by_user_id === user.id || booking.created_by === user.id;
  if (!isAdmin && !isOwn) {
    return NextResponse.json({ error: 'Non autorizzato a modificare questa prenotazione' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { booking_name, court_id, date, slot_start, slot_end, status, participants } = body;

    const hasReschedule =
      court_id !== undefined && date !== undefined && slot_start !== undefined && slot_end !== undefined;

    if (status === 'cancelled') {
      cancelBooking(id);
      return NextResponse.json({ success: true });
    }

    // Solo admin può modificare nome e dati prenotazione (campo, data, orario)
    if (isAdmin) {
      if (booking_name !== undefined) {
        if (typeof booking_name !== 'string' || !booking_name.trim()) {
          return NextResponse.json({
            success: false,
            error: 'Il nome della prenotazione non può essere vuoto',
          }, { status: 400 });
        }
        updateBooking(id, { booking_name: booking_name.trim() });
      }

      if (hasReschedule) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return NextResponse.json({ success: false, error: 'Data non valida (YYYY-MM-DD)' }, { status: 400 });
        }
        const courts = getCourtsOrdered();
        if (!courts.some((c) => c.id === court_id)) {
          return NextResponse.json({ success: false, error: 'Campo non trovato' }, { status: 400 });
        }
        const startMin = parseTime(slot_start);
        const endMin = parseTime(slot_end);
        const duration = endMin - startMin;
        if (duration !== 60 && duration !== 90) {
          return NextResponse.json({
            success: false,
            error: 'La durata deve essere 60 o 90 minuti',
          }, { status: 400 });
        }
        const config = getSiteConfig();
        const allowed = getAllowedDurations(config);
        if (!allowed.includes(duration)) {
          return NextResponse.json({
            success: false,
            error: `Durata ${duration} min non consentita`,
          }, { status: 400 });
        }
        const openStr = config.court_open_time ?? '08:00';
        const closeStr = config.court_close_time ?? '23:00';
        const openMin = parseTime(openStr);
        const closeMin = parseTime(closeStr);
        if (startMin < openMin || endMin > closeMin) {
          return NextResponse.json({
            success: false,
            error: 'Lo slot deve essere compreso negli orari di apertura del centro',
          }, { status: 400 });
        }
        const dayOfWeek = new Date(date + 'T12:00:00').getDay();
        const closedSlots = getAllClosedSlots().filter((s) => s.day_of_week === dayOfWeek);
        for (const closed of closedSlots) {
          const cStart = parseTime(closed.slot_start);
          const cEnd = parseTime(closed.slot_end);
          if (timeInRange(startMin, endMin, cStart, cEnd)) {
            return NextResponse.json({
              success: false,
              error: 'Lo slot ricade in un orario di chiusura del centro',
            }, { status: 400 });
          }
        }
        const existing = getBookingsByDate(date).filter(
          (b) => b.court_id === court_id && b.id !== id
        );
        for (const b of existing) {
          const bStart = parseTime(b.slot_start);
          const bEnd = parseTime(b.slot_end);
          if (timeInRange(startMin, endMin, bStart, bEnd)) {
            return NextResponse.json({
              success: false,
              error: 'Lo slot è già occupato su questo campo',
            }, { status: 400 });
          }
        }
        updateBooking(id, { court_id, date, slot_start, slot_end });
      }
    }

    if (Array.isArray(participants)) {
      if (participants.length !== 4) {
        return NextResponse.json({
          success: false,
          error: 'participants deve essere un array di 4 elementi',
        }, { status: 400 });
      }
      const existingUsers = getUsers();
      const existingIds = new Set(existingUsers.map((u) => u.id));
      const slots: { user_id?: string | null; guest_first_name?: string | null; guest_last_name?: string | null; guest_phone?: string | null }[] = [];
      for (let i = 0; i < 4; i++) {
        const raw = participants[i];
        if (raw === null || raw === undefined) {
          slots.push({});
          continue;
        }
        const item = raw as Record<string, unknown>;
        const userId = item.user_id != null && item.user_id !== '' ? String(item.user_id).trim() : null;
        const gFirst = item.guest_first_name != null && item.guest_first_name !== '' ? String(item.guest_first_name).trim() : null;
        const gLast = item.guest_last_name != null && item.guest_last_name !== '' ? String(item.guest_last_name).trim() : null;
        const gPhone = item.guest_phone != null && item.guest_phone !== '' ? String(item.guest_phone).trim() : null;
        if (userId) {
          if (!existingIds.has(userId)) {
            return NextResponse.json({
              success: false,
              error: `Utente non trovato: ${userId}`,
            }, { status: 400 });
          }
          slots.push({ user_id: userId });
        } else if (gFirst && gLast) {
          slots.push({ guest_first_name: gFirst, guest_last_name: gLast, guest_phone: gPhone || null });
        } else if (gFirst || gLast) {
          return NextResponse.json({
            success: false,
            error: 'Per un giocatore ospite sono obbligatori nome e cognome',
          }, { status: 400 });
        } else {
          slots.push({});
        }
      }
      setBookingParticipants(id, slots);
      const allFourFilled = slots.every(
        (s) => s.user_id || (s.guest_first_name && s.guest_last_name)
      );
      if (allFourFilled) {
        createMatchForBooking(id);
      }
    }

    // Modifica solo orario (stesso campo/data) quando non è stato fatto un reschedule completo
    const hasRescheduleDone = isAdmin && hasReschedule;
    if (slot_start != null && slot_end != null && !hasRescheduleDone) {
      const startMin = parseTime(slot_start);
      const endMin = parseTime(slot_end);
      const duration = endMin - startMin;
      if (duration !== 60 && duration !== 90) {
        return NextResponse.json({
          success: false,
          error: 'La durata deve essere 60 o 90 minuti',
        }, { status: 400 });
      }
      const config = getSiteConfig();
      const allowed = getAllowedDurations(config);
      if (!allowed.includes(duration)) {
        return NextResponse.json({
          success: false,
          error: `Durata ${duration} min non consentita`,
        }, { status: 400 });
      }
      const dayOfWeek = new Date(booking.date + 'T12:00:00').getDay();
      const closedSlots = getAllClosedSlots().filter((s) => s.day_of_week === dayOfWeek);
      for (const closed of closedSlots) {
        const cStart = parseTime(closed.slot_start);
        const cEnd = parseTime(closed.slot_end);
        if (timeInRange(startMin, endMin, cStart, cEnd)) {
          return NextResponse.json({
            success: false,
            error: 'Lo slot ricade in un orario di chiusura del centro',
          }, { status: 400 });
        }
      }
      const existing = getBookingsByDate(booking.date).filter(
        (b) => b.court_id === booking.court_id && b.id !== id
      );
      for (const b of existing) {
        const bStart = parseTime(b.slot_start);
        const bEnd = parseTime(b.slot_end);
        if (timeInRange(startMin, endMin, bStart, bEnd)) {
          return NextResponse.json({
            success: false,
            error: 'Lo slot è già occupato',
          }, { status: 400 });
        }
      }
      updateBooking(id, { slot_start, slot_end });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update booking error:', err);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(user)) {
    return NextResponse.json({ error: 'Utente in sola lettura' }, { status: 403 });
  }

  const booking = getBookingById(id);
  if (!booking) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
  }

  const isAdmin = user.role === 'admin';
  const isOwn = booking.booked_by_user_id === user.id || booking.created_by === user.id;
  if (!isAdmin && !isOwn) {
    return NextResponse.json({ error: 'Non autorizzato a eliminare questa prenotazione' }, { status: 403 });
  }

  cancelBooking(id);
  return NextResponse.json({ success: true });
}
