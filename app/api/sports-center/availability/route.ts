import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCourtsOrdered,
  getBookingsByDate,
  getAllClosedSlots,
  getSiteConfig,
} from '@/lib/db/queries';

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeInRange(start: number, end: number, slotStart: number, slotEnd: number): boolean {
  return start < slotEnd && end > slotStart;
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

  const config = getSiteConfig();
  const openStr = config.court_open_time ?? '08:00';
  const closeStr = config.court_close_time ?? '23:00';
  const openMin = parseTime(openStr);
  const closeMin = parseTime(closeStr);

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const closedSlots = getAllClosedSlots().filter((s) => s.day_of_week === dayOfWeek);
  const bookings = getBookingsByDate(date);
  const courts = getCourtsOrdered();

  const slotStep = 30;
  const result: Array<{
    court_id: string;
    court_name: string;
    court_type: string;
    slots: Array<{ slot_start: string; slot_end: string; status: 'free' | 'occupied' | 'closed'; booking_id?: string }>;
  }> = [];

  for (const court of courts) {
    const courtBookings = bookings.filter((b) => b.court_id === court.id);
    const slots: Array<{ slot_start: string; slot_end: string; status: 'free' | 'occupied' | 'closed'; booking_id?: string }> = [];

    for (let min = openMin; min + slotStep <= closeMin; min += slotStep) {
      const slotStart = formatTime(min);
      const slotEnd = formatTime(min + slotStep);
      const slotStartMin = min;
      const slotEndMin = min + slotStep;

      let status: 'free' | 'occupied' | 'closed' = 'free';
      let bookingId: string | undefined;

      for (const closed of closedSlots) {
        const cStart = parseTime(closed.slot_start);
        const cEnd = parseTime(closed.slot_end);
        if (timeInRange(slotStartMin, slotEndMin, cStart, cEnd)) {
          status = 'closed';
          break;
        }
      }

      if (status === 'free') {
        for (const b of courtBookings) {
          const bStart = parseTime(b.slot_start);
          const bEnd = parseTime(b.slot_end);
          if (timeInRange(slotStartMin, slotEndMin, bStart, bEnd)) {
            status = 'occupied';
            bookingId = b.id;
            break;
          }
        }
      }

      slots.push({
        slot_start: slotStart,
        slot_end: slotEnd,
        status,
        ...(bookingId ? { booking_id: bookingId } : {}),
      });
    }

    result.push({
      court_id: court.id,
      court_name: court.name,
      court_type: court.type,
      slots,
    });
  }

  return NextResponse.json({
    date,
    open_time: openStr,
    close_time: closeStr,
    courts: result,
  });
}
