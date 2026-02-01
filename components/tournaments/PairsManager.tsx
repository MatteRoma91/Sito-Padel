'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { User, Pair } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';

interface PairsManagerProps {
  tournamentId: string;
  pairs: Pair[];
  participatingUserIds: string[];
  userMap: Map<string, User>;
  rankingMap: Map<string, number>;
  hasMatches: boolean;
}

export function PairsManager({
  tournamentId,
  pairs,
  participatingUserIds,
  userMap,
  rankingMap,
  hasMatches,
}: PairsManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmExtract, setShowConfirmExtract] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');

  // Get players already in pairs
  const playersInPairs = new Set<string>();
  pairs.forEach(p => {
    playersInPairs.add(p.player1_id);
    playersInPairs.add(p.player2_id);
  });

  // Available players for manual pair creation
  const availablePlayers = participatingUserIds.filter(id => !playersInPairs.has(id));

  // Check if we have enough players for extraction
  const canExtract = participatingUserIds.length === 16;

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
        setShowConfirmExtract(false);
      } else {
        setError(data.error || 'Errore durante l\'estrazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddManualPair() {
    if (!player1Id || !player2Id) {
      setError('Seleziona entrambi i giocatori');
      return;
    }

    if (player1Id === player2Id) {
      setError('I due giocatori devono essere diversi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/pairs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1_id: player1Id, player2_id: player2Id }),
      });

      const data = await res.json();

      if (data.success) {
        router.refresh();
        setPlayer1Id('');
        setPlayer2Id('');
        setShowManualForm(false);
      } else {
        setError(data.error || 'Errore durante l\'aggiunta');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePair(pairId: string) {
    if (!confirm('Vuoi eliminare questa coppia?')) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/pairs/${pairId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore durante l\'eliminazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  function getUserName(userId: string): string {
    const user = userMap.get(userId);
    return user?.nickname || user?.full_name || user?.username || 'Sconosciuto';
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-[#B2FF00]" />
              Gestione Coppie
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              {pairs.length}/8 coppie formate
              {availablePlayers.length > 0 && ` • ${availablePlayers.length} giocatori disponibili`}
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Manual pair button */}
            {availablePlayers.length >= 2 && !hasMatches && (
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Aggiungi Manuale</span>
              </button>
            )}
            
            {/* Auto extract button */}
            {canExtract && !hasMatches && (
              <button
                onClick={() => pairs.length > 0 ? setShowConfirmExtract(true) : handleExtract()}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                <span className="hidden sm:inline">Estrazione Automatica</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Extraction confirmation */}
      {showConfirmExtract && (
        <div className="p-4 bg-accent-50 border-b border-[#e5ff99]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B2FF00] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[#629900]">
                Conferma estrazione automatica
              </p>
              <p className="text-sm text-[#76b300] mt-1">
                Questa azione eliminerà tutte le coppie esistenti e ne creerà 8 nuove basate sul livello dei giocatori.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleExtract}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Estrazione...' : 'Conferma'}
                </button>
                <button
                  onClick={() => setShowConfirmExtract(false)}
                  className="btn btn-secondary"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual pair form */}
      {showManualForm && (
        <div className="p-4 bg-primary-50 border-b border-[#9AB0F8]">
          <p className="font-medium text-slate-800 dark:text-slate-100 mb-3">
            Aggiungi Coppia Manuale
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Giocatore 1 (Forte)
              </label>
              <select
                value={player1Id}
                onChange={(e) => setPlayer1Id(e.target.value)}
                className="input"
              >
                <option value="">Seleziona...</option>
                {availablePlayers.map(id => {
                  const points = rankingMap.get(id) || 0;
                  return (
                    <option key={id} value={id}>
                      {getUserName(id)} ({points} pt)
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Giocatore 2 (Debole)
              </label>
              <select
                value={player2Id}
                onChange={(e) => setPlayer2Id(e.target.value)}
                className="input"
              >
                <option value="">Seleziona...</option>
                {availablePlayers.filter(id => id !== player1Id).map(id => {
                  const points = rankingMap.get(id) || 0;
                  return (
                    <option key={id} value={id}>
                      {getUserName(id)} ({points} pt)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddManualPair}
              disabled={loading || !player1Id || !player2Id}
              className="btn btn-primary"
            >
              {loading ? 'Aggiunta...' : 'Aggiungi Coppia'}
            </button>
            <button
              onClick={() => {
                setShowManualForm(false);
                setPlayer1Id('');
                setPlayer2Id('');
              }}
              className="btn btn-secondary"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Pairs list */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {pairs.length === 0 ? (
          <div className="p-8 text-center">
            <Shuffle className="w-12 h-12 mx-auto mb-3 text-slate-600 dark:text-slate-500" />
            <p className="text-slate-700 dark:text-slate-300">
              Nessuna coppia formata.
              {canExtract ? ' Usa l\'estrazione automatica o aggiungi manualmente.' : ` Servono 16 partecipanti (attualmente ${participatingUserIds.length}).`}
            </p>
          </div>
        ) : (
          pairs.map(pair => {
            const player1 = userMap.get(pair.player1_id);
            const player2 = userMap.get(pair.player2_id);
            const points1 = rankingMap.get(pair.player1_id) || 0;
            const points2 = rankingMap.get(pair.player2_id) || 0;

            return (
              <div key={pair.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-[#0c1451]/30 text-[#202ca1] dark:text-[#6270F3] text-sm font-medium">
                    Coppia {pair.seed}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Tot: {points1 + points2} pt
                    </span>
                    {!hasMatches && (
                      <button
                        onClick={() => handleDeletePair(pair.id)}
                        disabled={loading}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition"
                        title="Elimina coppia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={player1?.avatar || null} 
                      name={getUserName(pair.player1_id)} 
                      size="md" 
                    />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {getUserName(pair.player1_id)}
                      </p>
                      <p className="text-sm text-green-600">{points1} pt</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={player2?.avatar || null} 
                      name={getUserName(pair.player2_id)} 
                      size="md" 
                    />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {getUserName(pair.player2_id)}
                      </p>
                      <p className="text-sm text-[#B2FF00]">{points2} pt</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
