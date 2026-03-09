import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getBookingsByDate,
  createBooking,
  getCourtsOrdered,
  getBookingById,
  getAllClosedSlots,
  getSiteConfig,
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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Parametro date (YYYY-MM-DD) richiesto' }, { status: 400 });
  }

  const bookings = getBookingsByDate(date);
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(user)) {
    return NextResponse.json({ error: 'Utente in sola lettura' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      court_id,
      date,
      slot_start,
      slot_end,
      booking_name,
      booked_by_user_id,
      guest_name,
      guest_phone,
    } = body;

    if (!court_id || !date || !slot_start || !slot_end) {
      return NextResponse.json({
        success: false,
        error: 'court_id, date, slot_start e slot_end sono obbligatori',
      }, { status: 400 });
    }

    if (booking_name == null || typeof booking_name !== 'string' || !booking_name.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Il nome della prenotazione è obbligatorio',
      }, { status: 400 });
    }
    if (booking_name.trim().length > 200) {
      return NextResponse.json({
        success: false,
        error: 'Il nome della prenotazione non può superare i 200 caratteri',
      }, { status: 400 });
    }
    if (guest_name && typeof guest_name === 'string' && guest_name.trim().length > 200) {
      return NextResponse.json({
        success: false,
        error: 'Il nome ospite non può superare i 200 caratteri',
      }, { status: 400 });
    }
    if (guest_phone && typeof guest_phone === 'string' && guest_phone.trim().length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Il telefono ospite non può superare i 50 caratteri',
      }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'Data non valida (YYYY-MM-DD)' }, { status: 400 });
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
        error: `Durata ${duration} min non consentita (consentite: ${allowed.join(', ')} min)`,
      }, { status: 400 });
    }

    const courts = getCourtsOrdered();
    if (!courts.some((c) => c.id === court_id)) {
      return NextResponse.json({ success: false, error: 'Campo non trovato' }, { status: 404 });
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

    const existing = getBookingsByDate(date).filter((b) => b.court_id === court_id);
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

    const isAdmin = user.role === 'admin';
    let finalBookedBy: string | null = null;
    let finalGuestName: string | null = null;
    let finalGuestPhone: string | null = null;
    if (isAdmin) {
      const forGuest = !!(guest_name?.trim() || guest_phone?.trim());
      if (forGuest) {
        finalGuestName = guest_name?.trim() || null;
        finalGuestPhone = guest_phone?.trim() || null;
      } else {
        finalBookedBy = booked_by_user_id ?? user.id;
      }
    } else {
      finalBookedBy = user.id;
    }

    const id = createBooking({
      court_id,
      date,
      slot_start,
      slot_end,
      booking_name: booking_name.trim(),
      booked_by_user_id: finalBookedBy,
      guest_name: finalGuestName,
      guest_phone: finalGuestPhone,
      created_by: isAdmin ? user.id : null,
    });

    const booking = getBookingById(id);
    return NextResponse.json({ success: true, id, booking });
  } catch (err) {
    console.error('Create booking error:', err);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
