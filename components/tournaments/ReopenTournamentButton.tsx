'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Unlock } from 'lucide-react';

interface ReopenTournamentButtonProps {
  tournamentId: string;
}

export function ReopenTournamentButton({ tournamentId }: ReopenTournamentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleReopen() {
    if (!confirm('Vuoi riaprire il torneo per modifiche? Il torneo tornerà in stato "In corso" e potrai modificare risultati e coppie.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
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
    <div className="card p-4 border-[#e5ff99] bg-accent-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[#629900]">
            Torneo Completato
          </p>
          <p className="text-sm text-[#76b300]">
            Riapri per modificare risultati o coppie.
          </p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
        <button
          onClick={handleReopen}
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Unlock className="w-4 h-4" />
          {loading ? 'Riapertura...' : 'Riapri Torneo'}
        </button>
      </div>
    </div>
  );
}
