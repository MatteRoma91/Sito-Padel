'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus } from 'lucide-react';
import type { User, TournamentParticipant } from '@/lib/types';

interface ParticipantsManagerProps {
  tournamentId: string;
  participants: TournamentParticipant[];
  allUsers: User[];
  userMap: Map<string, User>;
}

export function ParticipantsManager({ 
  tournamentId, 
  participants, 
  allUsers, 
  userMap 
}: ParticipantsManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const participatingIds = new Set(participants.filter(p => p.participating).map(p => p.user_id));
  const availableUsers = allUsers.filter(u => !participatingIds.has(u.id));

  async function toggleParticipation(userId: string, isParticipating: boolean) {
    setLoading(userId);
    try {
      await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, participating: !isParticipating }),
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  }

  async function addParticipant(userId: string) {
    setLoading(userId);
    try {
      await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, participating: true }),
      });
      router.refresh();
      setShowAdd(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(null);
    }
  }

  const participatingUsers = Array.from(participatingIds).map(id => userMap.get(id)).filter(Boolean) as User[];

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">
          Partecipanti ({participatingUsers.length}/16)
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn btn-secondary flex items-center gap-2 text-sm py-1"
        >
          <UserPlus className="w-4 h-4" />
          Aggiungi
        </button>
      </div>

      {/* Add participant dropdown */}
      {showAdd && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-primary-50">
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">Seleziona un giocatore da aggiungere:</p>
          <div className="flex flex-wrap gap-2">
            {availableUsers.map(user => (
              <button
                key={user.id}
                onClick={() => addParticipant(user.id)}
                disabled={loading === user.id}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/90 border border-[#9AB0F8] text-sm hover:border-[#B2FF00] transition disabled:opacity-50"
              >
                {user.nickname || user.full_name || user.username}
              </button>
            ))}
            {availableUsers.length === 0 && (
              <p className="text-sm text-slate-700 dark:text-slate-300">Tutti i giocatori sono già partecipanti</p>
            )}
          </div>
        </div>
      )}

      {/* Participants list */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {participatingUsers.length === 0 ? (
          <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
            Nessun partecipante. Aggiungi almeno 16 giocatori per formare le coppie.
          </p>
        ) : (
          participatingUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#B2FF00] flex items-center justify-center text-slate-900 text-sm font-medium">
                  {(user.nickname || user.full_name || user.username).charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {user.nickname || user.full_name || user.username}
                </span>
              </div>
              <button
                onClick={() => toggleParticipation(user.id, true)}
                disabled={loading === user.id}
                className="p-1.5 rounded text-slate-600 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                title="Rimuovi partecipante"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Progress */}
      {participatingUsers.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-700 dark:text-slate-300">Progresso</span>
            <span className={participatingUsers.length >= 16 ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'}>
              {participatingUsers.length}/16
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${participatingUsers.length >= 16 ? 'bg-green-500' : 'bg-[#B2FF00]'}`}
              style={{ width: `${Math.min(100, (participatingUsers.length / 16) * 100)}%` }}
            />
          </div>
          {participatingUsers.length >= 16 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              ✓ Pronto per l&apos;estrazione delle coppie!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
