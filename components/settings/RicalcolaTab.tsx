'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

interface RicalcolaTabProps {
  completedTournamentsCount: number;
}

export function RicalcolaTab({ completedTournamentsCount }: RicalcolaTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ recalculated: number; totalCompleted: number } | null>(null);

  async function handleRecalculate() {
    if (!confirm('Ricalcolare i punteggi di tutti i tornei completati con il nuovo sistema (Grande Slam / Master 1000)?')) return;

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const res = await fetch('/api/rankings/recalculate-all', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSuccess({ recalculated: data.recalculated, totalCompleted: data.totalCompleted });
        router.refresh();
      } else {
        setError(data.error || 'Errore durante il ricalcolo');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <p className="text-slate-700 dark:text-slate-300">
        Ricalcola i punteggi di tutti i tornei già completati usando il sistema per categoria (Grande Slam / Master 1000).
        Verranno aggiornati i punteggi per torneo e la classifica cumulativa.
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Tornei completati: <strong>{completedTournamentsCount}</strong>
      </p>
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={loading}
        className="btn btn-primary flex items-center gap-2"
      >
        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Ricalcolo in corso...' : 'Ricalcola tutti i punteggi'}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Ricalcolati <strong>{success.recalculated}</strong> tornei su {success.totalCompleted} completati. Classifiche aggiornate.
        </p>
      )}
    </div>
  );
}
