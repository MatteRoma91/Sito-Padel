'use client';

import Link from 'next/link';
import { Clock, Trash2, ExternalLink } from 'lucide-react';
import type { Court } from '@/lib/types';

type Booking = {
  id: string;
  court_id: string;
  date: string;
  slot_start: string;
  slot_end: string;
  booking_name?: string;
  tournament_id?: string | null;
  booked_by_user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  status: string;
};

type UserOption = { id: string; nickname: string | null; full_name: string | null; username: string };

function displayUser(u: UserOption): string {
  return u.nickname?.trim() || u.full_name?.trim() || u.username || u.id;
}

interface BookingsListProps {
  bookings: Booking[];
  courts: Court[];
  users: UserOption[];
  currentUserId: string;
  isAdmin: boolean;
  canEdit: boolean;
  onCancel: (bookingId: string) => void;
}

export function BookingsList({ bookings, courts, users, currentUserId, isAdmin, canEdit, onCancel }: BookingsListProps) {
  const courtMap = new Map(courts.map((c) => [c.id, c]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  if (bookings.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Prenotazioni del giorno
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Nessuna prenotazione.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Prenotazioni del giorno
      </h3>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {bookings.map((b) => {
          const court = courtMap.get(b.court_id);
          const courtName = court?.name ?? b.court_id;
          const isOwn = b.booked_by_user_id === currentUserId;
          const canCancel = canEdit && (isAdmin || isOwn);
          const bookerLabel = b.guest_name
            ? b.guest_name
            : b.booked_by_user_id === currentUserId
              ? 'Io'
              : b.booked_by_user_id
                ? (userMap.get(b.booked_by_user_id) ? displayUser(userMap.get(b.booked_by_user_id)!) : 'Utente')
                : '—';
          const title = b.booking_name?.trim() || `Prenotazione ${courtName}`;
          return (
            <li key={b.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{title}</span>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">
                    {courtName} · {b.slot_start}–{b.slot_end}
                  </span>
                </div>
                <span className="block text-sm text-slate-500 dark:text-slate-400">{bookerLabel}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={b.tournament_id ? `/tournaments/${b.tournament_id}` : `/sports-center/bookings/${b.id}`}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  title={b.tournament_id ? 'Vai al torneo' : 'Dettaglio partita'}
                >
                  <ExternalLink className="w-5 h-5" />
                </Link>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => onCancel(b.id)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                    title="Annulla prenotazione"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
