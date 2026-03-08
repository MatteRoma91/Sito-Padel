'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

interface BookingFormProps {
  courtId: string;
  courtName: string;
  date: string;
  slotStart: string;
  allowedDurations: number[];
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onBooked: () => void;
}

export function BookingForm({
  courtId,
  courtName,
  date,
  slotStart,
  allowedDurations,
  isAdmin,
  currentUserId,
  onClose,
  onBooked,
}: BookingFormProps) {
  const [duration, setDuration] = useState<number>(allowedDurations.includes(60) ? 60 : allowedDurations[0] ?? 60);
  const [bookingName, setBookingName] = useState('');
  const [forGuest, setForGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slotEnd = addMinutes(slotStart, duration);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const name = bookingName.trim();
    if (!name) {
      setError('Il nome della prenotazione è obbligatorio');
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string | null> = {
        court_id: courtId,
        date,
        slot_start: slotStart,
        slot_end: slotEnd,
        booking_name: name,
      };
      if (isAdmin && forGuest) {
        body.guest_name = guestName.trim() || null;
        body.guest_phone = guestPhone.trim() || null;
      } else {
        body.booked_by_user_id = currentUserId;
      }
      const res = await fetch('/api/sports-center/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        onBooked();
      } else {
        setError(data.error || 'Errore durante la prenotazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Prenota campo</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>{courtName}</strong> – {date} – {slotStart}–{slotEnd}
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome prenotazione *</label>
            <input
              type="text"
              placeholder="Es. Partita amici"
              value={bookingName}
              onChange={(e) => setBookingName(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Durata</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="input w-full"
            >
              {allowedDurations.map((d) => (
                <option key={d} value={d}>{d} minuti</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!forGuest} onChange={() => setForGuest(false)} />
                <span className="text-sm">Prenota per me</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={forGuest} onChange={() => setForGuest(true)} />
                <span className="text-sm">Prenota per ospite</span>
              </label>
              {forGuest && (
                <div className="ml-6 space-y-2">
                  <input
                    type="text"
                    placeholder="Nome ospite"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="input w-full"
                  />
                  <input
                    type="text"
                    placeholder="Telefono"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="input w-full"
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn border border-slate-300 dark:border-slate-600">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Prenotazione...' : 'Conferma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
