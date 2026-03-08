import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getBookingsInDateRange,
  getCourtsOrdered,
  getMatchByBookingId,
  getTournamentById,
  getBookingParticipants,
  getUsers,
} from '@/lib/db/queries';
import type { CourtBookingParticipant } from '@/lib/types';
import type { User } from '@/lib/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Calendar, Clock, MapPin, ArrowRight, ChevronRight, Swords, Trophy } from 'lucide-react';

function formatDateRange(from: string, to: string): { fromDate: string; toDate: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  const next = new Date(today);
  next.setMonth(next.getMonth() + 1);
  const nextStr = next.toISOString().slice(0, 10);
  return {
    fromDate: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : todayStr,
    toDate: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : nextStr,
  };
}

function getDurationMinutes(slotStart: string, slotEnd: string): number {
  const [h1, m1] = slotStart.split(':').map(Number);
  const [h2, m2] = slotEnd.split(':').map(Number);
  return (h2 - h1) * 60 + (m2 - m1);
}

function displayUser(u: User): string {
  return (u.nickname?.trim() || u.full_name?.trim() || u.username || u.id) ?? '';
}

function getCoupleLabel(
  participants: CourtBookingParticipant[],
  positions: [number, number],
  userMap: Map<string, User>
): string {
  const names: string[] = [];
  for (const pos of positions) {
    const p = participants.find((x) => x.position === pos);
    if (!p) continue;
    if (p.user_id) {
      const u = userMap.get(p.user_id);
      if (u) names.push(displayUser(u));
    } else if (p.guest_first_name?.trim() || p.guest_last_name?.trim()) {
      names.push(`${(p.guest_first_name ?? '').trim()} ${(p.guest_last_name ?? '').trim()}`.trim());
    }
  }
  if (names.length === 0) return '';
  return names.join(' / ');
}

function formatResultPreview(match: {
  result_set1_c1: number | null;
  result_set1_c2: number | null;
  result_set2_c1: number | null;
  result_set2_c2: number | null;
  result_set3_c1: number | null;
  result_set3_c2: number | null;
}): string {
  const s1 = match.result_set1_c1 != null && match.result_set1_c2 != null
    ? `${match.result_set1_c1}-${match.result_set1_c2}`
    : null;
  const s2 = match.result_set2_c1 != null && match.result_set2_c2 != null
    ? `${match.result_set2_c1}-${match.result_set2_c2}`
    : null;
  const s3 = match.result_set3_c1 != null && match.result_set3_c2 != null
    ? `${match.result_set3_c1}-${match.result_set3_c2}`
    : null;
  const parts = [s1, s2, s3].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

export default async function PartitePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const { fromDate, toDate } = formatDateRange(params.from ?? '', params.to ?? '');

  const bookings = getBookingsInDateRange(fromDate, toDate);
  const courts = getCourtsOrdered();
  const courtMap = Object.fromEntries(courts.map((c) => [c.id, c]));
  const users = getUsers();
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6">
      <PageHeader
        title="Partite"
        subtitle="Prenotazioni e partite di padel nel periodo selezionato. Apri una partita per gestire i partecipanti e il risultato."
        icon={Swords}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Partite' }]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/sports-center"
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          Vai al Centro sportivo
        </Link>
      </div>

      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Filtra per periodo</h2>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <label htmlFor="from" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Da
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromDate}
              className="input w-full text-base"
            />
          </div>
          <div className="min-w-[140px]">
            <label htmlFor="to" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              A
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toDate}
              className="input w-full text-base"
            />
          </div>
          <button type="submit" className="btn btn-primary min-h-[2.75rem]">
            Applica
          </button>
        </form>
      </div>

      <section aria-label="Elenco partite">
        <h2 className="sr-only">Elenco partite</h2>
        <div className="space-y-3">
          {bookings.map((booking) => {
            const court = courtMap[booking.court_id];
            const courtName = court?.name ?? booking.court_id;
            const match = getMatchByBookingId(booking.id);
            const tournament = booking.tournament_id
              ? getTournamentById(booking.tournament_id)
              : null;
            const endDateTime = new Date(`${booking.date}T${booking.slot_end}`);
            const isPast = endDateTime < new Date();
            const duration = getDurationMinutes(booking.slot_start, booking.slot_end);
            const participants = getBookingParticipants(booking.id);
            const couple1Label = getCoupleLabel(participants, [1, 2], userMap) || 'Coppia 1';
            const couple2Label = getCoupleLabel(participants, [3, 4], userMap) || 'Coppia 2';
            const hasResult = match && match.result_winner != null
              && match.result_set1_c1 != null && match.result_set1_c2 != null
              && match.result_set2_c1 != null && match.result_set2_c2 != null;
            const resultPreview = match && hasResult ? formatResultPreview(match) : '';

            return (
              <Link
                key={booking.id}
                href={`/sports-center/bookings/${booking.id}`}
                className={`card p-4 sm:p-5 block transition hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm ${isPast ? 'opacity-90' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                        {new Date(booking.date + 'T12:00:00').toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 shrink-0" aria-hidden />
                        {booking.slot_start}–{booking.slot_end}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 shrink-0" aria-hidden />
                        {courtName}
                        {court?.type && (
                          <span className="text-slate-500 dark:text-slate-500">
                            ({court.type === 'outdoor' ? 'scoperto' : 'coperto'})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-slate-800 dark:text-slate-100">
                      <span className="font-medium truncate max-w-[calc(50%-1.5rem)]" title={couple1Label}>
                        {couple1Label}
                      </span>
                      <span className="flex items-center gap-1 shrink-0 text-primary-500 dark:text-primary-400" aria-hidden>
                        <Swords className="w-4 h-4" />
                        <span className="text-xs font-semibold">VS</span>
                      </span>
                      <span className="font-medium truncate max-w-[calc(50%-1.5rem)]" title={couple2Label}>
                        {couple2Label}
                      </span>
                    </div>
                    {resultPreview && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {resultPreview}
                        </span>
                        {match?.result_winner != null && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Trophy className="w-3.5 h-3.5" aria-hidden />
                            Vince {match.result_winner === 1 ? couple1Label : couple2Label}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {duration} min
                      </span>
                      {match && (
                        <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Confermata
                        </span>
                      )}
                      {hasResult && (
                        <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          Risultato inserito
                        </span>
                      )}
                      {tournament && (
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          Torneo: {tournament.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 shrink-0 text-slate-400 dark:text-slate-500 self-center sm:self-auto" aria-hidden />
                </div>
              </Link>
            );
          })}

          {bookings.length === 0 && (
            <div className="card p-8 sm:p-10 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <Swords className="w-7 h-7 text-slate-500 dark:text-slate-400" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium">Nessuna partita nel periodo</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Modifica le date del filtro oppure crea una prenotazione dal Centro sportivo.
              </p>
              <Link
                href="/sports-center"
                className="btn btn-primary mt-6 inline-flex items-center gap-2 min-h-[2.75rem]"
              >
                <ArrowRight className="w-4 h-4" />
                Vai al Centro sportivo
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
