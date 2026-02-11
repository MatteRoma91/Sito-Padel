'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Clock, Settings, XCircle } from 'lucide-react';

interface MvpAdminPanelProps {
  tournamentId: string;
  tournamentName: string;
  onSuccess?: () => void;
  mvpStatus: {
    isOpen: boolean;
    closesAt: string | null;
    allVoted: boolean;
    participantCount: number;
    votedCount: number;
  };
  voteCounts: { userId: string; voteCount: number; name: string }[];
  deadline: string | null;
  tied: { userId: string; name: string }[];
  mvpAssigned: string | null;
  needsAdminAssignment: boolean;
  participants: { userId: string; name: string }[];
}

function getTimeLeft(closesAt: string | null): { hours: number; minutes: number; seconds: number; isPast: boolean } {
  if (!closesAt) return { hours: 0, minutes: 0, seconds: 0, isPast: true };
  const target = new Date(closesAt);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, isPast: true };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isPast: false,
  };
}

function toDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

export function MvpAdminPanel({
  tournamentId,
  tournamentName,
  onSuccess,
  mvpStatus,
  voteCounts,
  deadline,
  tied,
  mvpAssigned,
  needsAdminAssignment,
  participants,
}: MvpAdminPanelProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(mvpStatus.closesAt));
  const [deadlineInput, setDeadlineInput] = useState(() => (deadline ? toDatetimeLocal(deadline) : ''));
  const [showAssignSection, setShowAssignSection] = useState(needsAdminAssignment);
  const [selectedMvp, setSelectedMvp] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(mvpStatus.closesAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [mvpStatus.closesAt]);

  async function handleSetDeadline() {
    if (!deadlineInput) {
      setError('Inserisci una data');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const d = new Date(deadlineInput);
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_deadline', mvpDeadline: d.toISOString() }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
        onSuccess?.();
      } else {
        setError(data.error || 'Errore');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
        onSuccess?.();
      } else if (data.needsAdminAssignment || (data.tied && data.tied.length > 0)) {
        setShowAssignSection(true);
        setSelectedMvp('');
      } else {
        setError(data.error || 'Errore');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignMvp() {
    setError('');
    setLoading(true);
    try {
      const body = selectedMvp === 'none'
        ? { action: 'assign_none' }
        : { action: 'assign', mvpUserId: selectedMvp };
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowAssignSection(false);
        router.refresh();
        onSuccess?.();
      } else {
        setError(data.error || 'Errore');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  const countdownText = mvpStatus.allVoted
    ? 'Tutti hanno votato'
    : timeLeft.isPast
      ? 'Votazione chiusa'
      : `${String(timeLeft.hours).padStart(2, '0')}h ${String(timeLeft.minutes).padStart(2, '0')}m ${String(timeLeft.seconds).padStart(2, '0')}s`;

  return (
    <div className="card p-6 border-2 border-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-6 h-6 text-amber-500" />
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
          Gestione MVP: {tournamentName}
        </h2>
      </div>

      <div className="space-y-4">
        {mvpAssigned && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            MVP assegnato: {mvpAssigned}
          </p>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <Clock className="w-4 h-4" />
          <span className="font-medium">Scadenza: {countdownText}</span>
          <span className="text-slate-500">({mvpStatus.votedCount}/{mvpStatus.participantCount} voti)</span>
        </div>

        {voteCounts.length > 0 && (
          <div className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Voti ricevuti:</span>
            <ul className="mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
              {voteCounts.map(c => (
                <li key={c.userId}>{c.name}: {c.voteCount} voti</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={deadlineInput}
              onChange={e => setDeadlineInput(e.target.value)}
              className="rounded-lg border border-primary-200 dark:border-primary-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleSetDeadline}
              disabled={loading}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Salva scadenza
            </button>
          </div>
          {mvpStatus.isOpen && (
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn btn-primary flex items-center gap-2"
            >
              Chiudi votazione
            </button>
          )}
        </div>

        {showAssignSection && (
          <div className="mt-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="font-medium text-slate-800 dark:text-slate-100 mb-2">
              {tied.length > 0
                ? 'Pareggio tra i seguenti giocatori. Scegli MVP o nessuno:'
                : 'Assegna o conferma l\'MVP del torneo:'}
            </p>
            <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
              {(participants.length > 0 ? participants : tied).map(t => (
                <label
                  key={t.userId}
                  className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <input
                    type="radio"
                    name="assign-mvp"
                    value={t.userId}
                    checked={selectedMvp === t.userId}
                    onChange={() => setSelectedMvp(t.userId)}
                    className="accent-accent-500"
                  />
                  <span>{t.name}</span>
                  {voteCounts.find(v => v.userId === t.userId) != null && (
                    <span className="text-xs text-slate-500">
                      ({voteCounts.find(v => v.userId === t.userId)?.voteCount} voti)
                    </span>
                  )}
                </label>
              ))}
              <label className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                <input
                  type="radio"
                  name="assign-mvp"
                  value="none"
                  checked={selectedMvp === 'none'}
                  onChange={() => setSelectedMvp('none')}
                  className="accent-accent-500"
                />
                <XCircle className="w-4 h-4" />
                <span>Nessun MVP</span>
              </label>
            </div>
            <button
              type="button"
              onClick={handleAssignMvp}
              disabled={loading || !selectedMvp}
              className="btn btn-primary"
            >
              {loading ? 'Salvataggio...' : 'Conferma'}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
