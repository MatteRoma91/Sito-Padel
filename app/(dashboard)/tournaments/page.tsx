import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getTournaments } from '@/lib/db/queries';
import { TOURNAMENT_CATEGORY_LABELS } from '@/lib/types';
import { Plus, Trophy, Calendar, MapPin, Clock } from 'lucide-react';

export default async function TournamentsPage() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  
  const tournaments = getTournaments();

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Bozza', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
    open: { label: 'Iscrizioni aperte', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    in_progress: { label: 'In corso', color: 'bg-[#c5d4fc] text-[#202ca1] dark:bg-[#0c1451]/30 dark:text-[#6270F3]' },
    completed: { label: 'Completato', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tornei</h1>
        {isAdmin && (
          <Link href="/tournaments/new" className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo Torneo</span>
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {tournaments.map(tournament => {
          const status = statusLabels[tournament.status] || statusLabels.draft;
          const isPast = new Date(tournament.date) < new Date();
          
          return (
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.id}`}
              className="card p-4 block hover:border-[#B2FF00] transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                      {tournament.name}
                    </h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {tournament.category && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        {TOURNAMENT_CATEGORY_LABELS[tournament.category]}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(tournament.date).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    {tournament.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {tournament.time}
                      </span>
                    )}
                    {tournament.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {tournament.venue}
                      </span>
                    )}
                  </div>
                </div>
                
                <Trophy className={`w-8 h-8 ${isPast ? 'text-slate-600 dark:text-slate-500' : 'text-[#B2FF00]'}`} />
              </div>
            </Link>
          );
        })}

        {tournaments.length === 0 && (
          <div className="card p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-600 dark:text-slate-500" />
            <p className="text-slate-700 dark:text-slate-300">Nessun torneo presente</p>
            {isAdmin && (
              <Link href="/tournaments/new" className="btn btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Crea il primo torneo
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
