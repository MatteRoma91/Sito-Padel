'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';

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

type MatchInfo = {
  id: string;
  booking_id: string;
  created_at: string;
  result_winner: number | null;
  result_set1_c1: number | null;
  result_set1_c2: number | null;
  result_set2_c1: number | null;
  result_set2_c2: number | null;
  result_set3_c1: number | null;
  result_set3_c2: number | null;
  result_entered_at: string | null;
} | null;

export type ParticipantSlot = {
  user_id?: string | null;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_phone?: string;
};

function displayUser(u: UserOption): string {
  return u.nickname?.trim() || u.full_name?.trim() || u.username || u.id;
}

function getCoupleNames(
  slots: ParticipantSlot[],
  userMap: Map<string, UserOption>
): string[] {
  const names: string[] = [];
  for (const slot of slots) {
    if (slot.user_id) {
      const u = userMap.get(slot.user_id);
      names.push(u ? displayUser(u) : '—');
    } else if ((slot.guest_first_name ?? '').trim() || (slot.guest_last_name ?? '').trim()) {
      names.push(`${(slot.guest_first_name ?? '').trim()} ${(slot.guest_last_name ?? '').trim()}`.trim());
    } else {
      names.push('—');
    }
  }
  return names;
}

function slotEqual(a: ParticipantSlot, b: ParticipantSlot): boolean {
  const au = a.user_id ?? '';
  const bu = b.user_id ?? '';
  if (au !== bu) return false;
  if ((a.guest_first_name ?? '') !== (b.guest_first_name ?? '')) return false;
  if ((a.guest_last_name ?? '') !== (b.guest_last_name ?? '')) return false;
  if ((a.guest_phone ?? '') !== (b.guest_phone ?? '')) return false;
  return true;
}

interface BookingDetailClientProps {
  booking: BookingInfo;
  courts: CourtOption[];
  initialParticipants: ParticipantSlot[];
  users: UserOption[];
  canEdit: boolean;
  canReopen: boolean;
  canEditParticipants: boolean;
  isAdmin: boolean;
  match: MatchInfo;
  canSaveResult: boolean;
}

function normalizeInitial(init: ParticipantSlot[]): ParticipantSlot[] {
  const arr = [...init];
  while (arr.length < 4) arr.push({});
  return arr.slice(0, 4);
}

export function BookingDetailClient({
  booking,
  courts,
  initialParticipants,
  users,
  canEdit,
  canReopen,
  canEditParticipants,
  isAdmin,
  match,
  canSaveResult,
}: BookingDetailClientProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState<ParticipantSlot[]>(
    () => normalizeInitial(initialParticipants)
  );
  const [bookingName, setBookingName] = useState(booking.booking_name);
  const [courtId, setCourtId] = useState(booking.court_id);
  const [date, setDate] = useState(booking.date);
  const [slotStart, setSlotStart] = useState(booking.slot_start);
  const [slotEnd, setSlotEnd] = useState(booking.slot_end);
  const [saving, setSaving] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resultWinner, setResultWinner] = useState<1 | 2>(1);
  const [resultSet1, setResultSet1] = useState({ c1: 0, c2: 0 });
  const [resultSet2, setResultSet2] = useState({ c1: 0, c2: 0 });
  const [resultSet3, setResultSet3] = useState<{ c1: number; c2: number } | null>(null);

  const initial = normalizeInitial(initialParticipants);

  useEffect(() => {
    setBookingName(booking.booking_name);
    setCourtId(booking.court_id);
    setDate(booking.date);
    setSlotStart(booking.slot_start);
    setSlotEnd(booking.slot_end);
  }, [booking.id, booking.booking_name, booking.court_id, booking.date, booking.slot_start, booking.slot_end]);

  useEffect(() => {
    setParticipants(normalizeInitial(initialParticipants));
  }, [booking.id, JSON.stringify(initialParticipants)]);

  const setSlot = (index: number, slot: ParticipantSlot) => {
    const next = [...participants];
    next[index] = slot;
    setParticipants(next);
    setMessage(null);
  };

  const handleUserChange = (index: number, userId: string) => {
    if (userId) setSlot(index, { user_id: userId });
    else setSlot(index, {});
  };

  const handleGuestChange = (index: number, field: 'guest_first_name' | 'guest_last_name' | 'guest_phone', value: string) => {
    const prev = participants[index] ?? {};
    const next = { ...prev, [field]: value };
    if (!next.user_id) setSlot(index, next);
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
        router.refresh();
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

  const handleSaveResult = async () => {
    setSavingResult(true);
    setResultMessage(null);
    try {
      const body: {
        result_winner: 1 | 2;
        set1: { c1: number; c2: number };
        set2: { c1: number; c2: number };
        set3?: { c1: number; c2: number };
      } = {
        result_winner: resultWinner,
        set1: resultSet1,
        set2: resultSet2,
      };
      if (resultSet3 != null) body.set3 = resultSet3;
      const res = await fetch(`/api/sports-center/bookings/${booking.id}/result`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setResultMessage({ type: 'success', text: 'Risultato salvato.' });
        router.refresh();
      } else {
        setResultMessage({ type: 'error', text: data.error || 'Errore durante il salvataggio' });
      }
    } catch {
      setResultMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setSavingResult(false);
    }
  };

  const handleReopen = async () => {
    if (!confirm('Riaprire la partita? I partecipanti potranno essere modificati di nuovo. L\'eventuale risultato verrà rimosso.')) return;
    setReopening(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sports-center/bookings/${booking.id}/reopen`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore durante la riapertura' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setReopening(false);
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
    (initial.length !== 4 || initial.some((init, i) => !slotEqual(init, participants[i] ?? {})));

  const displayCourt = courts.find((c) => c.id === courtId) ?? { name: booking.court_name, type: booking.court_type };
  const courtTypeLabel = displayCourt.type === 'outdoor' ? 'scoperto' : 'coperto';
  const userMap = new Map(users.map((u) => [u.id, u]));
  const bookingEndPast = match
    ? new Date(`${booking.date}T${booking.slot_end}`) < new Date()
    : false;
  const showResultSection = match && bookingEndPast;

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

      {match && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Partita confermata
          </span>
          {match.created_at && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(match.created_at).toLocaleDateString('it-IT')}
            </span>
          )}
          {canReopen && (
            <button
              type="button"
              onClick={handleReopen}
              disabled={reopening}
              className="btn btn-secondary text-sm min-h-0 py-1.5 px-3"
            >
              {reopening ? 'Riapertura...' : 'Riapri partita'}
            </button>
          )}
        </div>
      )}

      <section>
        <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Partecipanti</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Coppia 1</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map((index) => {
            const slot = participants[index] ?? {};
            const hasUser = slot.user_id != null && String(slot.user_id).trim() !== '';
            const hasGuestFields = Boolean(((slot.guest_first_name ?? '').trim() || (slot.guest_last_name ?? '').trim()));
            const isGuestMode = 'guest_first_name' in slot || 'guest_last_name' in slot || hasGuestFields;
            const isGuest = !hasUser && isGuestMode;
            const isUserMode = hasUser || ('user_id' in slot && !isGuestMode);
            const assignedUser = slot.user_id ? userMap.get(slot.user_id) : null;
            const guestLabel = (slot.guest_first_name ?? '').trim() || (slot.guest_last_name ?? '').trim()
              ? `${(slot.guest_first_name ?? '').trim()} ${(slot.guest_last_name ?? '').trim()}`.trim()
              : null;
            return (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-8">
                    {index + 1}.
                  </span>
                  {(assignedUser || guestLabel) && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {assignedUser ? displayUser(assignedUser) : `Ospite: ${guestLabel}`}
                    </span>
                  )}
                </div>
                {canEditParticipants ? (
                  <div className="space-y-2 pl-0">
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`participant-type-${index}`}
                          checked={!!isUserMode}
                          onChange={() => setSlot(index, { user_id: (slot.user_id ?? '') })}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">Utente</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`participant-type-${index}`}
                          checked={!!isGuest}
                          onChange={() => setSlot(index, {
                            guest_first_name: (slot.guest_first_name ?? '').trim() || '',
                            guest_last_name: (slot.guest_last_name ?? '').trim() || '',
                            guest_phone: slot.guest_phone ?? '',
                          })}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">Ospite</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`participant-type-${index}`}
                          checked={!isUserMode && !isGuest ? true : false}
                          onChange={() => setSlot(index, {})}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">Nessuno</span>
                      </label>
                    </div>
                    {isUserMode ? (
                      <select
                        value={slot.user_id ?? ''}
                        onChange={(e) => handleUserChange(index, e.target.value)}
                        className="input flex-1 max-w-xs"
                      >
                        <option value="">Seleziona utente</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {displayUser(u)}
                          </option>
                        ))}
                      </select>
                    ) : isGuest ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nome *"
                          value={slot.guest_first_name ?? ''}
                          onChange={(e) => handleGuestChange(index, 'guest_first_name', e.target.value)}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Cognome *"
                          value={slot.guest_last_name ?? ''}
                          onChange={(e) => handleGuestChange(index, 'guest_last_name', e.target.value)}
                          className="input"
                        />
                        <input
                          type="tel"
                          placeholder="Cellulare (opzionale)"
                          value={slot.guest_phone ?? ''}
                          onChange={(e) => handleGuestChange(index, 'guest_phone', e.target.value)}
                          className="input"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {assignedUser ? displayUser(assignedUser) : guestLabel || '—'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Coppia 2</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[2, 3].map((index) => {
            const slot = participants[index] ?? {};
            const hasUser = slot.user_id != null && String(slot.user_id).trim() !== '';
            const hasGuestFields = Boolean(((slot.guest_first_name ?? '').trim() || (slot.guest_last_name ?? '').trim()));
            const isGuestMode = 'guest_first_name' in slot || 'guest_last_name' in slot || hasGuestFields;
            const isGuest = !hasUser && isGuestMode;
            const isUserMode = hasUser || ('user_id' in slot && !isGuestMode);
            const assignedUser = slot.user_id ? userMap.get(slot.user_id) : null;
            const guestLabel = (slot.guest_first_name ?? '').trim() || (slot.guest_last_name ?? '').trim()
              ? `${(slot.guest_first_name ?? '').trim()} ${(slot.guest_last_name ?? '').trim()}`.trim()
              : null;
            return (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-8">
                    {index + 1}.
                  </span>
                  {(assignedUser || guestLabel) && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {assignedUser ? displayUser(assignedUser) : `Ospite: ${guestLabel}`}
                    </span>
                  )}
                </div>
                {canEditParticipants ? (
                  <div className="space-y-2 pl-0">
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`participant-type-${index}`}
                          checked={!!isUserMode}
                          onChange={() => setSlot(index, { user_id: (slot.user_id ?? '') })}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">Utente</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`participant-type-${index}`}
                          checked={!!isGuest}
                          onChange={() => setSlot(index, {
                            guest_first_name: (slot.guest_first_name ?? '').trim() || '',
                            guest_last_name: (slot.guest_last_name ?? '').trim() || '',
                            guest_phone: slot.guest_phone ?? '',
                          })}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">Ospite</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`participant-type-${index}`}
                          checked={!isUserMode && !isGuest ? true : false}
                          onChange={() => setSlot(index, {})}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">Nessuno</span>
                      </label>
                    </div>
                    {isUserMode ? (
                      <select
                        value={slot.user_id ?? ''}
                        onChange={(e) => handleUserChange(index, e.target.value)}
                        className="input flex-1 max-w-xs"
                      >
                        <option value="">Seleziona utente</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {displayUser(u)}
                          </option>
                        ))}
                      </select>
                    ) : isGuest ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nome *"
                          value={slot.guest_first_name ?? ''}
                          onChange={(e) => handleGuestChange(index, 'guest_first_name', e.target.value)}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Cognome *"
                          value={slot.guest_last_name ?? ''}
                          onChange={(e) => handleGuestChange(index, 'guest_last_name', e.target.value)}
                          className="input"
                        />
                        <input
                          type="tel"
                          placeholder="Cellulare (opzionale)"
                          value={slot.guest_phone ?? ''}
                          onChange={(e) => handleGuestChange(index, 'guest_phone', e.target.value)}
                          className="input"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {assignedUser ? displayUser(assignedUser) : guestLabel || '—'}
                  </p>
                )}
              </div>
            );
          })}
            </div>
          </div>
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

      {canEditParticipants && (
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn btn-primary"
          >
            {saving ? 'Salvataggio...' : 'Salva partecipanti'}
          </button>
          {!hasChanges && participants.some((s) => s.user_id || (s.guest_first_name ?? '').trim() || (s.guest_last_name ?? '').trim()) && (
            <span className="text-sm text-slate-500 dark:text-slate-400">Nessuna modifica da salvare</span>
          )}
        </div>
      )}

      {showResultSection && match && (
        <section>
          <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Risultato</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Giochi per set (padel)</p>
          {match.result_winner != null ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-0 bg-slate-50 dark:bg-slate-800/50">
                <div
                  className={`p-4 text-center ${match.result_winner === 1 ? 'ring-2 ring-inset ring-amber-400 dark:ring-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : ''}`}
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Coppia 1</div>
                  <div className="text-sm text-slate-800 dark:text-slate-100">
                    {getCoupleNames(participants.slice(0, 2), userMap).join(' / ')}
                  </div>
                  {match.result_winner === 1 && (
                    <div className="mt-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                      <Trophy className="w-3.5 h-3.5" aria-hidden />
                      Vincitori
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center px-2 text-slate-400 dark:text-slate-500 text-xs font-medium border-x border-slate-200 dark:border-slate-700">
                  Set
                </div>
                <div
                  className={`p-4 text-center ${match.result_winner === 2 ? 'ring-2 ring-inset ring-amber-400 dark:ring-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : ''}`}
                >
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Coppia 2</div>
                  <div className="text-sm text-slate-800 dark:text-slate-100">
                    {getCoupleNames(participants.slice(2, 4), userMap).join(' / ')}
                  </div>
                  {match.result_winner === 2 && (
                    <div className="mt-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                      <Trophy className="w-3.5 h-3.5" aria-hidden />
                      Vincitori
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border-t border-slate-200 dark:border-slate-700">
                <div className="p-3 text-center">
                  <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {match.result_set1_c1 ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-center px-2 border-x border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Set 1
                </div>
                <div className="p-3 text-center border-l border-slate-200 dark:border-slate-700">
                  <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {match.result_set1_c2 ?? 0}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border-t border-slate-200 dark:border-slate-700">
                <div className="p-3 text-center">
                  <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {match.result_set2_c1 ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-center px-2 border-x border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Set 2
                </div>
                <div className="p-3 text-center border-l border-slate-200 dark:border-slate-700">
                  <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {match.result_set2_c2 ?? 0}
                  </span>
                </div>
              </div>
              {match.result_set3_c1 != null && match.result_set3_c2 != null && (
                <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border-t border-slate-200 dark:border-slate-700">
                  <div className="p-3 text-center">
                    <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {match.result_set3_c1}
                    </span>
                  </div>
                  <div className="flex items-center justify-center px-2 border-x border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Set 3
                  </div>
                  <div className="p-3 text-center border-l border-slate-200 dark:border-slate-700">
                    <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {match.result_set3_c2}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : canSaveResult ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-0 bg-slate-50 dark:bg-slate-800/50">
                  <div className="p-3 text-center">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Coppia 1</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 truncate px-1">
                      {getCoupleNames(participants.slice(0, 2), userMap).join(' / ')}
                    </div>
                  </div>
                  <div className="w-10 border-x border-slate-200 dark:border-slate-700" />
                  <div className="p-3 text-center">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Coppia 2</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 truncate px-1">
                      {getCoupleNames(participants.slice(2, 4), userMap).join(' / ')}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border-t border-slate-200 dark:border-slate-700">
                  <div className="p-2 flex justify-center">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={resultSet1.c1}
                      onChange={(e) => setResultSet1((s) => ({ ...s, c1: parseInt(e.target.value, 10) || 0 }))}
                      className="input w-14 text-center text-lg font-bold tabular-nums"
                      aria-label="Set 1 giochi Coppia 1"
                    />
                  </div>
                  <div className="flex items-center justify-center px-2 border-x border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Set 1
                  </div>
                  <div className="p-2 flex justify-center border-l border-slate-200 dark:border-slate-700">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={resultSet1.c2}
                      onChange={(e) => setResultSet1((s) => ({ ...s, c2: parseInt(e.target.value, 10) || 0 }))}
                      className="input w-14 text-center text-lg font-bold tabular-nums"
                      aria-label="Set 1 giochi Coppia 2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border-t border-slate-200 dark:border-slate-700">
                  <div className="p-2 flex justify-center">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={resultSet2.c1}
                      onChange={(e) => setResultSet2((s) => ({ ...s, c1: parseInt(e.target.value, 10) || 0 }))}
                      className="input w-14 text-center text-lg font-bold tabular-nums"
                      aria-label="Set 2 giochi Coppia 1"
                    />
                  </div>
                  <div className="flex items-center justify-center px-2 border-x border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Set 2
                  </div>
                  <div className="p-2 flex justify-center border-l border-slate-200 dark:border-slate-700">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={resultSet2.c2}
                      onChange={(e) => setResultSet2((s) => ({ ...s, c2: parseInt(e.target.value, 10) || 0 }))}
                      className="input w-14 text-center text-lg font-bold tabular-nums"
                      aria-label="Set 2 giochi Coppia 2"
                    />
                  </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30">
                    <input
                      type="checkbox"
                      checked={resultSet3 != null}
                      onChange={(e) => setResultSet3(e.target.checked ? { c1: 0, c2: 0 } : null)}
                      className="rounded border-slate-300"
                    />
                    Set 3 (opzionale)
                  </label>
                  {resultSet3 != null && (
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-0 border-t border-slate-200 dark:border-slate-700">
                      <div className="p-2 flex justify-center">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={resultSet3.c1}
                          onChange={(e) => setResultSet3((s) => s ? { ...s, c1: parseInt(e.target.value, 10) || 0 } : null)}
                          className="input w-14 text-center text-lg font-bold tabular-nums"
                          aria-label="Set 3 giochi Coppia 1"
                        />
                      </div>
                      <div className="flex items-center justify-center px-2 border-x border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Set 3
                      </div>
                      <div className="p-2 flex justify-center border-l border-slate-200 dark:border-slate-700">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={resultSet3.c2}
                          onChange={(e) => setResultSet3((s) => s ? { ...s, c2: parseInt(e.target.value, 10) || 0 } : null)}
                          className="input w-14 text-center text-lg font-bold tabular-nums"
                          aria-label="Set 3 giochi Coppia 2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vincitore</label>
                <select
                  value={resultWinner}
                  onChange={(e) => setResultWinner(Number(e.target.value) as 1 | 2)}
                  className="input w-full max-w-xs"
                >
                  <option value={1}>Coppia 1</option>
                  <option value={2}>Coppia 2</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={savingResult}
                className="btn btn-primary"
              >
                {savingResult ? 'Salvataggio...' : 'Salva risultato'}
              </button>
              {resultMessage && (
                <p
                  className={`text-sm ${resultMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  role="alert"
                >
                  {resultMessage.text}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Risultato non ancora inserito.</p>
          )}
        </section>
      )}

    </div>
  );
}
