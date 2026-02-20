import Link from 'next/link';
import { getTournaments } from '@/lib/db/queries';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default async function CalendarPage() {
  const tournaments = getTournaments();

  // Group by month
  const byMonth = new Map<string, typeof tournaments>();
  tournaments.forEach(t => {
    const monthKey = t.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, []);
    }
    byMonth.get(monthKey)!.push(t);
  });

  // Sort months
  const sortedMonths = Array.from(byMonth.keys()).sort();

  const today = new Date().toISOString().slice(0, 10);

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    in_progress: 'bg-primary-100 text-[#202ca1] dark:bg-[#0c1451]/30 dark:text-primary-300',
    completed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Bozza',
    open: 'Iscrizioni aperte',
    in_progress: 'In corso',
    completed: 'Completato',
  };

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Calendario Tornei</h1>

      {tournaments.length === 0 ? (
        <div className="card p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-700 dark:text-slate-300" />
          <p className="text-slate-700 dark:text-slate-300">
            Nessun torneo in calendario
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map(monthKey => {
            const monthDate = new Date(monthKey + '-01');
            const monthLabel = monthDate.toLocaleDateString('it-IT', { 
              month: 'long', 
              year: 'numeric' 
            });
            const monthTournaments = byMonth.get(monthKey)!;

            return (
              <div key={monthKey}>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 capitalize">
                  {monthLabel}
                </h2>
                <div className="space-y-3">
                  {monthTournaments.map(t => {
                    const isPast = t.date < today;
                    const isToday = t.date === today;
                    
                    return (
                      <Link
                        key={t.id}
                        href={`/tournaments/${t.id}`}
                        className={`card p-4 block hover:border-accent-500 transition ${
                          isPast ? 'opacity-60' : ''
                        } ${isToday ? 'border-accent-500 ring-2 ring-accent-100' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            {/* Date badge */}
                            <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                              isToday ? 'bg-accent-500 text-slate-900' :
                              isPast ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' :
                              'bg-primary-100 dark:bg-[#0c1451]/30 text-[#202ca1] dark:text-primary-300'
                            }`}>
                              <span className="text-xl font-bold leading-none">
                                {new Date(t.date).getDate()}
                              </span>
                              <span className="text-xs uppercase mt-0.5">
                                {new Date(t.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                                {t.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-700 dark:text-slate-300">
                                {t.time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {t.time}
                                  </span>
                                )}
                                {t.venue && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {t.venue}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[t.status] || statusColors.draft}`}>
                              {statusLabels[t.status] || 'Bozza'}
                            </span>
                            {isToday && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-500 text-slate-900">
                                Oggi
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
