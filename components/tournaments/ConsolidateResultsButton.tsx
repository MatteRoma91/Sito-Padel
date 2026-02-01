'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, CheckCircle } from 'lucide-react';

interface ConsolidateResultsButtonProps {
  tournamentId: string;
}

export function ConsolidateResultsButton({ tournamentId }: ConsolidateResultsButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConsolidate() {
    if (!confirm('Vuoi consolidare i risultati del torneo? Questo calcolerà le classifiche e aggiornerà le statistiche dei giocatori.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rankings/calculate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore durante il consolidamento');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Tutti i risultati inseriti!
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Consolida i risultati per calcolare le classifiche e aggiornare le statistiche.
          </p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <button
          onClick={handleConsolidate}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Trophy className="w-4 h-4" />
          {loading ? 'Consolidamento...' : 'Consolida Risultati'}
        </button>
      </div>
    </div>
  );
}
