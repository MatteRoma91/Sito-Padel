'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle, AlertTriangle } from 'lucide-react';

interface PairsExtractorProps {
  tournamentId: string;
  hasExistingPairs: boolean;
}

export function PairsExtractor({ tournamentId, hasExistingPairs }: PairsExtractorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleExtract() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/pairs/extract`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        router.refresh();
        setShowConfirm(false);
      } else {
        setError(data.error || 'Errore durante l\'estrazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  if (hasExistingPairs && !showConfirm) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#B2FF00]">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Coppie già estratte</span>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="btn btn-secondary"
          >
            Rigenera Coppie
          </button>
        </div>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="card p-4 border-[#e5ff99] bg-accent-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-[#B2FF00] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-[#629900]">
              Conferma rigenerazione coppie
            </p>
            <p className="text-sm text-[#76b300] mt-1">
              Questa azione eliminerà le coppie esistenti e ne creerà di nuove. 
              Tutti i match e i risultati associati verranno persi.
            </p>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleExtract}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Estrazione...' : 'Conferma'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-secondary"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">Pronto per l&apos;estrazione</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            16 partecipanti confermati
          </p>
        </div>
        <button
          onClick={handleExtract}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Shuffle className="w-4 h-4" />
          {loading ? 'Estrazione...' : 'Estrai Coppie'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
