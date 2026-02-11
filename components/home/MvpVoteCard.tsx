'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Clock } from 'lucide-react';

interface MvpVoteCardProps {
  tournamentId: string;
  tournamentName: string;
  closesAt: string | null;
  allVoted: boolean;
  candidates: { id: string; name: string }[];
}

function getTimeLeft(closesAt: string | null): { hours: number; minutes: number; seconds: number; isPast: boolean } {
  if (!closesAt) return { hours: 0, minutes: 0, seconds: 0, isPast: true };
  const target = new Date(closesAt);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isPast: false };
}

export function MvpVoteCard({
  tournamentId,
  tournamentName,
  closesAt,
  allVoted,
  candidates,
}: MvpVoteCardProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(closesAt));
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(closesAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [closesAt]);

  async function handleVote() {
    if (!selected) {
      setError('Seleziona un giocatore');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votedUserId: selected }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore durante il voto');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  const countdownText = allVoted
    ? 'Tutti hanno votato'
    : timeLeft.isPast
      ? 'Votazione chiusa'
      : `${String(timeLeft.hours).padStart(2, '0')}h ${String(timeLeft.minutes).padStart(2, '0')}m ${String(timeLeft.seconds).padStart(2, '0')}s`;

  return (
    <div className="card p-6 border-2 border-accent-500/50 bg-accent-50/30 dark:bg-accent-900/10">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-6 h-6 text-amber-500" />
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
          Vota l&apos;MVP del torneo {tournamentName}
        </h2>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm text-slate-700 dark:text-slate-300">
        <Clock className="w-4 h-4" />
        <span className="font-medium">Chiusura: {countdownText}</span>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-600">Nessun candidato disponibile.</p>
      ) : (
        <>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
            Chi è stato il Most Valuable Player di questa tappa?
          </p>
          <div className="space-y-2 mb-4">
            {candidates.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                  selected === c.id
                    ? 'bg-accent-200 dark:bg-accent-800/40'
                    : 'hover:bg-primary-100 dark:hover:bg-primary-800/30'
                }`}
              >
                <input
                  type="radio"
                  name="mvp-vote"
                  value={c.id}
                  checked={selected === c.id}
                  onChange={() => setSelected(c.id)}
                  className="accent-accent-500"
                />
                <span className="font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
              </label>
            ))}
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
          )}
          <button
            type="button"
            onClick={handleVote}
            disabled={loading || !selected || timeLeft.isPast}
            className="btn btn-primary"
          >
            {loading ? 'Invio...' : 'Vota'}
          </button>
        </>
      )}
    </div>
  );
}
