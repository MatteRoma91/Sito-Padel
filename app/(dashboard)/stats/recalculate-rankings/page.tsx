import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getTournaments } from '@/lib/db/queries';
import { RefreshCw } from 'lucide-react';
import { RecalculateRankingsClient } from './RecalculateRankingsClient';

export default async function RecalculateRankingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.role !== 'admin') redirect('/');

  const tournaments = getTournaments();
  const completedCount = tournaments.filter(t => t.status === 'completed').length;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <RefreshCw className="w-7 h-7 text-accent-500" />
        Ricalcola punteggi
      </h1>
      <p className="text-slate-700 dark:text-slate-300">
        Ricalcola i punteggi di tutti i tornei già completati usando il nuovo sistema per categoria (Grande Slam / Master 1000).
        Verranno aggiornati i punteggi per torneo e la classifica cumulativa.
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Tornei completati: <strong>{completedCount}</strong>
      </p>
      <RecalculateRankingsClient />
    </div>
  );
}
