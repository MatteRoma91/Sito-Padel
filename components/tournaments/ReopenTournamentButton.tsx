'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Unlock } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ReopenTournamentButtonProps {
  tournamentId: string;
}

export function ReopenTournamentButton({ tournamentId }: ReopenTournamentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleReopen() {
    setShowConfirm(true);
  }

  async function confirmReopen() {
    setShowConfirm(false);
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
    <div className="card p-4 border-primary-100 dark:border-primary-300/50 bg-primary-100/70 dark:bg-surface-dark/30">
      <ConfirmDialog
        open={showConfirm}
        title="Riapri torneo"
        message="Vuoi riaprire il torneo per modifiche? Il torneo tornerà in stato &quot;In corso&quot; e potrai modificare risultati e coppie."
        confirmLabel="Riapri"
        cancelLabel="Annulla"
        onConfirm={confirmReopen}
        onCancel={() => setShowConfirm(false)}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            Torneo Completato
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
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
