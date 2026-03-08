'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type BookingInfo = {
  id: string;
  booking_name: string;
  court_id: string;
  court_name: string;
  court_type: string;
  date: string;
  slot_start: string;
  slot_end: string;
};

type CourtOption = { id: string; name: string; type: string };

type UserOption = {
  id: string;
  nickname: string | null;
  full_name: string | null;
  username: string;
};

function displayUser(u: UserOption): string {
  return u.nickname?.trim() || u.full_name?.trim() || u.username || u.id;
}

interface BookingDetailClientProps {
  booking: BookingInfo;
  courts: CourtOption[];
  initialParticipants: (string | null)[];
  users: UserOption[];
  canEdit: boolean;
  isAdmin: boolean;
}

export function BookingDetailClient({
  booking,
  courts,
  initialParticipants,
  users,
  canEdit,
  isAdmin,
}: BookingDetailClientProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState<(string | null)[]>(
    () => [...initialParticipants, null, null, null].slice(0, 4)
  );
  const [bookingName, setBookingName] = useState(booking.booking_name);
  const [courtId, setCourtId] = useState(booking.court_id);
  const [date, setDate] = useState(booking.date);
  const [slotStart, setSlotStart] = useState(booking.slot_start);
  const [slotEnd, setSlotEnd] = useState(booking.slot_end);
  const [saving, setSaving] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setBookingName(booking.booking_name);
    setCourtId(booking.court_id);
    setDate(booking.date);
    setSlotStart(booking.slot_start);
    setSlotEnd(booking.slot_end);
  }, [booking.id, booking.booking_name, booking.court_id, booking.date, booking.slot_start, booking.slot_end]);

  const handlePositionChange = (index: number, value: string) => {
    const next = [...participants];
    next[index] = value === '' ? null : value;
    setParticipants(next);
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sports-center/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Partecipanti aggiornati.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore durante il salvataggio' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sports-center/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_name: bookingName.trim(),
          court_id: courtId,
          date,
          slot_start: slotStart,
          slot_end: slotEnd,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Modifiche salvate.' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore durante il salvataggio' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSavingDetails(false);
    }
  };

  const hasDetailsChanges =
    bookingName.trim() !== booking.booking_name ||
    courtId !== booking.court_id ||
    date !== booking.date ||
    slotStart !== booking.slot_start ||
    slotEnd !== booking.slot_end;

  const hasChanges =
    participants.length === 4 &&
    (initialParticipants[0] !== participants[0] ||
      initialParticipants[1] !== participants[1] ||
      initialParticipants[2] !== participants[2] ||
      initialParticipants[3] !== participants[3]);

  const displayCourt = courts.find((c) => c.id === courtId) ?? { name: booking.court_name, type: booking.court_type };
  const courtTypeLabel = displayCourt.type === 'outdoor' ? 'scoperto' : 'coperto';
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="card space-y-6">
      <div>
        {isAdmin ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome prenotazione
              </label>
              <input
                type="text"
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                className="input w-full"
                placeholder="Es. Partita amici"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Campo
                </label>
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="input w-full"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'outdoor' ? 'scoperto' : 'coperto'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dalle
                </label>
                <input
                  type="time"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="input w-full"
                  step="1800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alle
                </label>
                <input
                  type="time"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="input w-full"
                  step="1800"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveDetails}
              disabled={savingDetails || !hasDetailsChanges}
              className="btn btn-primary"
            >
              {savingDetails ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {booking.booking_name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {booking.court_name} <span className="text-slate-500">({courtTypeLabel})</span>
              {' · '}
              {booking.date} · {booking.slot_start}–{booking.slot_end}
            </p>
          </>
        )}
      </div>

      <section>
        <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Partecipanti</h3>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => {
            const userId = participants[index];
            const assignedUser = userId ? userMap.get(userId) : null;
            return (
              <div key={index} className="flex flex-col gap-1">
                {assignedUser && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Posizione {index + 1}: {displayUser(assignedUser)}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400 w-8">
                    {index + 1}.
                  </span>
                  <select
                    value={participants[index] ?? ''}
                    onChange={(e) => handlePositionChange(index, e.target.value)}
                    disabled={!canEdit}
                    className="input flex-1"
                  >
                    <option value="">Nessuno</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {displayUser(u)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {message && (
        <p
          className={`text-sm ${
            message.type === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      {canEdit && (
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn btn-primary"
          >
            {saving ? 'Salvataggio...' : 'Salva partecipanti'}
          </button>
          {!hasChanges && participants.some(Boolean) && (
            <span className="text-sm text-slate-500 dark:text-slate-400">Nessuna modifica da salvare</span>
          )}
        </div>
      )}
    </div>
  );
}
