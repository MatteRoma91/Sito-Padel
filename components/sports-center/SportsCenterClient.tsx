'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CourtGrid } from './CourtGrid';
import { BookingsList } from './BookingsList';
import { BookingForm } from './BookingForm';
import type { Court } from '@/lib/types';

type AvailabilityCourt = {
  court_id: string;
  court_name: string;
  court_type: string;
  slots: Array<{ slot_start: string; slot_end: string; status: 'free' | 'occupied' | 'closed'; booking_id?: string }>;
};

type Booking = {
  id: string;
  court_id: string;
  date: string;
  slot_start: string;
  slot_end: string;
  booking_name: string;
  booked_by_user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  status: string;
};

type UserOption = { id: string; nickname: string | null; full_name: string | null; username: string };

interface SportsCenterClientProps {
  courts: Court[];
  users: UserOption[];
  user: { id: string; role: string; nickname: string | null; full_name: string | null; username: string };
  allowedDurations: number[];
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function SportsCenterClient({ courts, users, user, allowedDurations }: SportsCenterClientProps) {
  const [weekStart, setWeekStart] = useState(() => {
    const t = new Date();
    const day = t.getDay();
    const diff = (day + 6) % 7;
    t.setDate(t.getDate() - diff);
    return t.toISOString().slice(0, 10);
  });
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekMode, setWeekMode] = useState(false);
  const [availability, setAvailability] = useState<{ courts: AvailabilityCourt[] } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState<{ courtId: string; courtName: string; slotStart: string; slotEnd: string } | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);

  const isGuest = user.role === 'guest';
  const isAdmin = user.role === 'admin';

  const fetchData = useCallback(async () => {
    const targetDate = weekMode ? weekStart : date;
    if (!targetDate) return;
    setLoading(true);
    try {
      if (!weekMode) {
        const [avRes, bookRes] = await Promise.all([
          fetch(`/api/sports-center/availability?date=${date}`),
          fetch(`/api/sports-center/bookings?date=${date}`),
        ]);
        if (avRes.ok) {
          const av = await avRes.json();
          setAvailability(av);
        } else setAvailability(null);
        if (bookRes.ok) {
          const data = await bookRes.json();
          setBookings(data.bookings ?? []);
        } else setBookings([]);
      } else {
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const bookResults = await Promise.all(
          days.map((d) => fetch(`/api/sports-center/bookings?date=${d}`).then((r) => (r.ok ? r.json() : { bookings: [] })))
        );
        const merged = bookResults.flatMap((b) => b.bookings ?? []);
        setBookings(merged);
        const avRes = await fetch(`/api/sports-center/availability?date=${weekStart}`);
        if (avRes.ok) setAvailability(await avRes.json());
        else setAvailability(null);
      }
    } catch {
      setAvailability(null);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [date, weekMode, weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBooked = () => {
    setBookingModal(null);
    fetchData();
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookingToCancel(bookingId);
  };

  const confirmCancelBooking = async () => {
    const id = bookingToCancel;
    setBookingToCancel(null);
    if (!id) return;
    try {
      const res = await fetch(`/api/sports-center/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch {
      // ignore
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const goPrevDay = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
  };
  const goNextDay = () => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={bookingToCancel !== null}
        title="Annulla prenotazione"
        message="Annullare questa prenotazione?"
        confirmLabel="Annulla prenotazione"
        cancelLabel="Indietro"
        variant="danger"
        onConfirm={confirmCancelBooking}
        onCancel={() => setBookingToCancel(null)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevDay}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Giorno precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Calendar className="w-5 h-5" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-auto"
            />
          </label>
          <button
            type="button"
            onClick={goNextDay}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Giorno successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {date !== today && (
          <button
            type="button"
            onClick={() => setDate(today)}
            className="btn border border-slate-300 dark:border-slate-600"
          >
            Oggi
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`btn border ${!weekMode ? 'border-accent-500 bg-accent-500/10' : 'border-slate-300 dark:border-slate-600'}`}
            onClick={() => setWeekMode(false)}
          >
            Giorno
          </button>
          <button
            type="button"
            className={`btn border ${weekMode ? 'border-accent-500 bg-accent-500/10' : 'border-slate-300 dark:border-slate-600'}`}
            onClick={() => setWeekMode(true)}
          >
            Settimana
          </button>
        </div>
        {weekMode && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <button
              type="button"
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              {weekStart} → {addDays(weekStart, 6)}
            </span>
            <button
              type="button"
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-600 dark:text-slate-400">
          Caricamento...
        </div>
      ) : availability?.courts?.length && !weekMode ? (
        <>
          <CourtGrid
            courts={availability.courts}
            bookings={bookings}
            canBook={!isGuest}
            onSlotClick={(courtId, courtName, slotStart, slotEnd) => {
              if (!isGuest) setBookingModal({ courtId, courtName, slotStart, slotEnd });
            }}
          />
          <BookingsList
            bookings={bookings}
            courts={courts}
            users={users}
            currentUserId={user.id}
            isAdmin={isAdmin}
            canEdit={!isGuest}
            onCancel={handleCancelBooking}
          />
        </>
      ) : weekMode ? (
        <BookingsList
          bookings={bookings}
          courts={courts}
          users={users}
          currentUserId={user.id}
          isAdmin={isAdmin}
          canEdit={!isGuest}
          onCancel={handleCancelBooking}
        />
      ) : (
        <div className="card p-8 text-center text-slate-600 dark:text-slate-400">
          Nessun campo configurato o dati non disponibili.
        </div>
      )}

      {bookingModal && (
        <BookingForm
          courtId={bookingModal.courtId}
          courtName={bookingModal.courtName}
          date={date}
          slotStart={bookingModal.slotStart}
          allowedDurations={allowedDurations}
          isAdmin={isAdmin}
          currentUserId={user.id}
          onClose={() => setBookingModal(null)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}
