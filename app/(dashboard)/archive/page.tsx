import Link from 'next/link';
import { getTournamentsPastFiltered, getAllPastTournamentDates } from '@/lib/db/queries';
import { Trophy, Calendar } from 'lucide-react';
import { ArchiveFilters } from '@/components/archive/ArchiveFilters';

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; name?: string }>;
}) {
  const params = await searchParams;

  const tournaments = getTournamentsPastFiltered({
    year: params.year,
    month: params.month,
    name: params.name,
  });

  // Get available years for filter
  const allPastDates = getAllPastTournamentDates();
  const years = Array.from(new Set(allPastDates.map(t => t.date.slice(0, 4)))).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Archivio Tornei</h1>

      {/* Filters */}
      <ArchiveFilters 
        currentYear={params.year} 
        currentMonth={params.month} 
        currentName={params.name}
        years={years}
      />

      {/* Results */}
      <div className="space-y-3">
        {tournaments.length === 0 ? (
          <div className="card p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-600 dark:text-slate-500" />
            <p className="text-slate-700 dark:text-slate-300">
              Nessun torneo trovato con i filtri selezionati
            </p>
          </div>
        ) : (
          tournaments.map(t => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="card p-4 block hover:border-accent-500 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t.name}</h2>
                  <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(t.date).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Trophy className="w-6 h-6 text-slate-600" />
              </div>
            </Link>
          ))
        )}
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-300 text-center">
        {tournaments.length} torneo/i trovato/i
      </p>
    </div>
  );
}
