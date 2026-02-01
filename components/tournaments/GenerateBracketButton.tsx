'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Grid3X3 } from 'lucide-react';

interface GenerateBracketButtonProps {
  tournamentId: string;
}

export function GenerateBracketButton({ tournamentId }: GenerateBracketButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/bracket/generate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore durante la generazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            Genera il Tabellone
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Le 8 coppie sono pronte. Genera il tabellone per iniziare il torneo.
          </p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Grid3X3 className="w-4 h-4" />
          {loading ? 'Generazione...' : 'Genera Tabellone'}
        </button>
      </div>
    </div>
  );
}
