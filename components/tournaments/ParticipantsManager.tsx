'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus } from 'lucide-react';
import type { User, TournamentParticipant } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { fetchJson } from '@/lib/fetch-json';

interface ParticipantsManagerProps {
  tournamentId: string;
  participants: TournamentParticipant[];
  allUsers: User[];
  userMap: Map<string, User>;
  maxPlayers?: number;
}

export function ParticipantsManager({
  tournamentId,
  participants,
  allUsers,
  userMap,
  maxPlayers = 16,
}: ParticipantsManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | 'batch' | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const participatingIds = new Set(participants.filter((p) => p.participating).map((p) => p.user_id));
  const availableUsers = allUsers.filter((u) => !participatingIds.has(u.id));
  const slotsRemaining = Math.max(0, maxPlayers - participatingIds.size);

  const participatingUsers = Array.from(participatingIds).map((id) => userMap.get(id)).filter(Boolean) as User[];

  useEffect(() => {
    if (!showAdd) {
      setSelectedIds(new Set());
      return;
    }
    const pid = new Set(participants.filter((p) => p.participating).map((p) => p.user_id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (!pid.has(id) && allUsers.some((u) => u.id === id)) {
          next.add(id);
        }
      }
      return next.size === prev.size && [...prev].every((id) => next.has(id)) ? prev : next;
    });
  }, [showAdd, participants, allUsers]);

  function toggleSelectUser(userId: string) {
    if (selectedIds.has(userId)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      return;
    }
    if (participatingIds.size + selectedIds.size >= maxPlayers) {
      showToast(`Puoi aggiungere al massimo ${maxPlayers} partecipanti.`, 'error');
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function toggleParticipation(userId: string, isParticipating: boolean) {
    setLoading(userId);
    try {
      const res = await fetchJson(`/api/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, participating: !isParticipating }),
      });
      if (!res.ok) {
        showToast(res.error, 'error');
        return;
      }
      const data = res.data as { success?: boolean; error?: string; warnings?: string[] };
      if (data && data.success === false) {
        showToast(data.error || 'Errore', 'error');
        return;
      }
      for (const w of data?.warnings ?? []) {
        showToast(w, 'info');
      }
      showToast(!isParticipating ? 'Partecipante aggiunto' : 'Partecipante rimosso', 'success');
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function addSelectedParticipants() {
    const order = Array.from(selectedIds);
    if (order.length === 0) return;

    setLoading('batch');
    try {
      let warningsShown = false;
      for (let i = 0; i < order.length; i++) {
        const userId = order[i];
        const res = await fetchJson(`/api/tournaments/${tournamentId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, participating: true }),
        });
        if (!res.ok) {
          showToast(res.error, 'error');
          await router.refresh();
          setSelectedIds(new Set(order.slice(i)));
          return;
        }
        const data = res.data as { success?: boolean; error?: string; warnings?: string[] };
        if (data && data.success === false) {
          showToast(data.error || 'Errore', 'error');
          await router.refresh();
          setSelectedIds(new Set(order.slice(i)));
          return;
        }
        if (!warningsShown && data?.warnings?.length) {
          for (const w of data.warnings) {
            showToast(w, 'info');
          }
          warningsShown = true;
        }
      }

      await router.refresh();
      setSelectedIds(new Set());
      showToast(order.length === 1 ? 'Giocatore aggiunto' : `Aggiunti ${order.length} giocatori`, 'success');
    } finally {
      setLoading(null);
    }
  }

  const nSelected = selectedIds.size;
  const canAddSelection =
    nSelected > 0 && participatingIds.size + nSelected <= maxPlayers && loading !== 'batch';

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">
          Partecipanti ({participatingUsers.length}/{maxPlayers})
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd((open) => !open)}
          disabled={participatingUsers.length >= maxPlayers}
          className="btn btn-secondary flex items-center gap-2 text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-4 h-4" />
          Aggiungi
        </button>
      </div>

      {showAdd && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-primary-100/70 dark:bg-surface-dark/30 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Seleziona i giocatori da aggiungere (clic per selezionare/deselezionare), poi conferma con il pulsante qui sotto.
            <span className="block mt-1 text-slate-600 dark:text-slate-400">Posti liberi: {slotsRemaining}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addSelectedParticipants}
              disabled={!canAddSelection}
              className="btn btn-primary text-sm py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'batch'
                ? 'Aggiunta in corso…'
                : nSelected === 0
                  ? 'Aggiungi selezionati'
                  : `Aggiungi ${nSelected} selezionat${nSelected === 1 ? 'o' : 'i'}`}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={nSelected === 0 || loading === 'batch'}
              className="btn btn-secondary text-sm py-1.5 disabled:opacity-50"
            >
              Deseleziona tutti
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableUsers.map((user) => {
              const selected = selectedIds.has(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleSelectUser(user.id)}
                  disabled={loading === 'batch'}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition disabled:opacity-50 ${
                    selected
                      ? 'bg-accent-500 border-accent-600 text-slate-900 ring-2 ring-accent-400/50'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {user.nickname || user.full_name || user.username}
                </button>
              );
            })}
            {availableUsers.length === 0 && (
              <p className="text-sm text-slate-700 dark:text-slate-300">Tutti i giocatori sono già partecipanti</p>
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {participatingUsers.length === 0 ? (
          <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
            Nessun partecipante. Aggiungi almeno {maxPlayers} giocatori per formare le coppie.
          </p>
        ) : (
          participatingUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-slate-900 text-sm font-medium">
                  {(user.nickname || user.full_name || user.username).charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {user.nickname || user.full_name || user.username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleParticipation(user.id, true)}
                disabled={loading === user.id || loading === 'batch'}
                className="p-1.5 rounded text-slate-600 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                title="Rimuovi partecipante"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {participatingUsers.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-700 dark:text-slate-300">Progresso</span>
            <span className={participatingUsers.length >= maxPlayers ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'}>
              {participatingUsers.length}/{maxPlayers}
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${participatingUsers.length >= maxPlayers ? 'bg-green-500' : 'bg-accent-500'}`}
              style={{ width: `${Math.min(100, (participatingUsers.length / maxPlayers) * 100)}%` }}
            />
          </div>
          {participatingUsers.length >= maxPlayers && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              ✓ Pronto per l&apos;estrazione delle coppie!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
