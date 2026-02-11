'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

interface ReopenMvpVotingButtonProps {
  tournamentId: string;
  tournamentName: string;
}

export function ReopenMvpVotingButton({ tournamentId, tournamentName }: ReopenMvpVotingButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleReopen() {
    if (!confirm(`Vuoi riaprire la votazione MVP per "${tournamentName}"? I voti già espressi resteranno validi e la scadenza sarà impostata a 48 ore da ora.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      });

      const data = await res.json();

      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore durante la riapertura');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 border-2 border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Votazione MVP chiusa
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Puoi riaprire la votazione. I voti già espressi resteranno validi.
          </p>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}
        </div>
        <button
          onClick={handleReopen}
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {loading ? 'Riapertura...' : 'Riapri votazione MVP'}
        </button>
      </div>
    </div>
  );
}
