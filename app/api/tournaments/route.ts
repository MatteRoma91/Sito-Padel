import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import {
  getTournaments,
  createTournament,
  createTournamentWithCourtBookings,
  getCourtsOrdered,
  getBookingsByDate,
  getAllClosedSlots,
  getSiteConfig,
} from '@/lib/db/queries';
import { createTournamentSchema, parseOrThrow, ValidationError } from '@/lib/validations';
import { sendPushToAllPlayers } from '@/lib/notifications/push';

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const tournaments = getTournaments();
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(user)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Solo gli admin possono creare tornei' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = parseOrThrow(createTournamentSchema, body);
    const { name, date, time, venue, category, maxPlayers, slot_start, slot_end, court_ids } = data;

    const validCategory = category === 'grand_slam' ? 'grand_slam' : 'master_1000';
    const validMaxPlayers = maxPlayers === 8 ? 8 : 16;
    const courtIdsFiltered = Array.isArray(court_ids) ? court_ids.filter((id): id is string => typeof id === 'string' && id.trim() !== '') : [];

    if (courtIdsFiltered.length > 0) {
      if (!slot_start || !slot_end || typeof slot_start !== 'string' || typeof slot_end !== 'string') {
        return NextResponse.json({ success: false, error: 'Con riserva campi sono obbligatori slot_start e slot_end' }, { status: 400 });
      }
      const startMin = parseTime(slot_start);
      const endMin = parseTime(slot_end);
      const duration = endMin - startMin;
      if (duration !== 60 && duration !== 90) {
        return NextResponse.json({ success: false, error: 'La durata deve essere 60 o 90 minuti' }, { status: 400 });
      }
      const config = getSiteConfig();
      const allowed = getAllowedDurations(config);
      if (!allowed.includes(duration)) {
        return NextResponse.json({ success: false, error: `Durata ${duration} min non consentita` }, { status: 400 });
      }
      const courts = getCourtsOrdered();
      for (const courtId of courtIdsFiltered) {
        if (!courts.some((c) => c.id === courtId)) {
          return NextResponse.json({ success: false, error: `Campo non trovato: ${courtId}` }, { status: 400 });
        }
      }
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const closedSlots = getAllClosedSlots().filter((s) => s.day_of_week === dayOfWeek);
      for (const closed of closedSlots) {
        const cStart = parseTime(closed.slot_start);
        const cEnd = parseTime(closed.slot_end);
        if (timeInRange(startMin, endMin, cStart, cEnd)) {
          return NextResponse.json({ success: false, error: 'Lo slot ricade in un orario di chiusura del centro' }, { status: 400 });
        }
      }
      const existing = getBookingsByDate(date);
      for (const courtId of courtIdsFiltered) {
        const courtBookings = existing.filter((b) => b.court_id === courtId);
        for (const b of courtBookings) {
          const bStart = parseTime(b.slot_start);
          const bEnd = parseTime(b.slot_end);
          if (timeInRange(startMin, endMin, bStart, bEnd)) {
            return NextResponse.json({ success: false, error: 'Uno o più campi hanno già una prenotazione in questo orario' }, { status: 400 });
          }
        }
      }

      const id = createTournamentWithCourtBookings({
        name,
        date,
        time: time ?? undefined,
        venue: venue ?? undefined,
        category: validMaxPlayers === 8 ? 'brocco_500' : validCategory,
        max_players: validMaxPlayers,
        created_by: user.id,
        slot_start,
        slot_end,
        court_ids: courtIdsFiltered,
      });
      void sendPushToAllPlayers({
        title: 'Nuovo torneo',
        body: `${name} — ${date}${time ? ` ore ${time}` : ''}`,
        url: `/tournaments/${id}`,
      }).catch(() => undefined);
      return NextResponse.json({ success: true, id });
    }

    const id = createTournament({
      name,
      date,
      time: time ?? undefined,
      venue: venue ?? undefined,
      category: validMaxPlayers === 8 ? 'brocco_500' : validCategory,
      max_players: validMaxPlayers,
      created_by: user.id,
    });

    void sendPushToAllPlayers({
      title: 'Nuovo torneo',
      body: `${name} — ${date}${time ? ` ore ${time}` : ''}`,
      url: `/tournaments/${id}`,
    }).catch(() => undefined);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Create tournament error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
