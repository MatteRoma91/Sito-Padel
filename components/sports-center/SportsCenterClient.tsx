'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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

export function SportsCenterClient({ courts, users, user, allowedDurations }: SportsCenterClientProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [availability, setAvailability] = useState<{ courts: AvailabilityCourt[] } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState<{ courtId: string; courtName: string; slotStart: string; slotEnd: string } | null>(null);

  const isGuest = user.role === 'guest';
  const isAdmin = user.role === 'admin';

  const fetchData = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
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
    } catch {
      setAvailability(null);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBooked = () => {
    setBookingModal(null);
    fetchData();
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Annullare questa prenotazione?')) return;
    try {
      const res = await fetch(`/api/sports-center/bookings/${bookingId}`, { method: 'DELETE' });
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
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-600 dark:text-slate-400">
          Caricamento...
        </div>
      ) : availability?.courts?.length ? (
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
