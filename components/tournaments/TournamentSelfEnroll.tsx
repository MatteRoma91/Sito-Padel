'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/fetch-json';
import { useToast } from '@/components/ui/Toast';

interface TournamentSelfEnrollProps {
  tournamentId: string;
  maxPlayers: number;
  participatingCount: number;
  currentUserId: string;
  /** Utente già con participating=1 */
  isEnrolled: boolean;
}

export function TournamentSelfEnroll({
  tournamentId,
  maxPlayers,
  participatingCount,
  currentUserId,
  isEnrolled,
}: TournamentSelfEnrollProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function setParticipation(participating: boolean) {
    setLoading(true);
    try {
      const res = await fetchJson(`/api/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, participating }),
      });
      if (!res.ok) {
        showToast(res.error, 'error');
        return;
      }
      showToast(participating ? 'Sei iscritto al torneo' : 'Iscrizione annullata', 'success');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const full = participatingCount >= maxPlayers;

  return (
    <div className="card p-4 border border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-950/20">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">Iscrizione al torneo</p>
      {isEnrolled ? (
        <button
          type="button"
          className="btn btn-secondary text-sm"
          disabled={loading}
          onClick={() => void setParticipation(false)}
        >
          {loading ? '...' : 'Annulla iscrizione'}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary text-sm"
          disabled={loading || full}
          onClick={() => void setParticipation(true)}
        >
          {full ? 'Posti esauriti' : loading ? '...' : 'Iscrivimi'}
        </button>
      )}
    </div>
  );
}
