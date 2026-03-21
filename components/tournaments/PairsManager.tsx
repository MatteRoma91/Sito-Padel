'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle, Plus, Trash2, AlertTriangle, Pencil, Save, Undo2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { User, Pair } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';

interface PairsManagerProps {
  tournamentId: string;
  maxPlayers: number;
  pairs: Pair[];
  participatingUserIds: string[];
  userMap: Map<string, User>;
  rankingMap: Map<string, number>;
  hasMatches: boolean;
}

export function PairsManager({
  tournamentId,
  maxPlayers,
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
  const [pairToDelete, setPairToDelete] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [editingPairIds, setEditingPairIds] = useState<Set<string>>(new Set());
  const [draftEdits, setDraftEdits] = useState<Record<string, { player1_id: string; player2_id: string }>>({});
  const [showPlayedAck, setShowPlayedAck] = useState(false);

  // Get players already in pairs
  const playersInPairs = new Set<string>();
  pairs.forEach(p => {
    playersInPairs.add(p.player1_id);
    playersInPairs.add(p.player2_id);
  });

  // Available players for manual pair creation
  const availablePlayers = participatingUserIds.filter(id => !playersInPairs.has(id));

  const expectedPlayers = maxPlayers === 8 ? 8 : 16;
  const expectedPairs = maxPlayers === 8 ? 4 : 8;

  // Check if we have enough players for extraction
  const canExtract = participatingUserIds.length === expectedPlayers;
  const pendingUpdates = pairs
    .map((pair) => {
      const draft = draftEdits[pair.id];
      if (!draft) return null;
      if (draft.player1_id === pair.player1_id && draft.player2_id === pair.player2_id) return null;
      return {
        pair_id: pair.id,
        player1_id: draft.player1_id,
        player2_id: draft.player2_id,
      };
    })
    .filter((update): update is { pair_id: string; player1_id: string; player2_id: string } => !!update);

  function startEditPair(pair: Pair) {
    setError('');
    setEditingPairIds((prev) => {
      const next = new Set(prev);
      next.add(pair.id);
      return next;
    });
    setDraftEdits((prev) => ({
      ...prev,
      [pair.id]: prev[pair.id] || { player1_id: pair.player1_id, player2_id: pair.player2_id },
    }));
  }

  function cancelEditPair(pair: Pair) {
    setEditingPairIds((prev) => {
      const next = new Set(prev);
      next.delete(pair.id);
      return next;
    });
    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[pair.id];
      return next;
    });
  }

  function updateDraftPlayer(pairId: string, slot: 'player1_id' | 'player2_id', value: string) {
    setDraftEdits((prev) => ({
      ...prev,
      [pairId]: {
        player1_id: prev[pairId]?.player1_id || '',
        player2_id: prev[pairId]?.player2_id || '',
        [slot]: value,
      },
    }));
  }

  async function saveAllPairCompositions(acknowledgePlayedMatches: boolean) {
    if (pendingUpdates.length === 0) {
      setError('Non ci sono modifiche da salvare');
      return;
    }
    for (const update of pendingUpdates) {
      if (!update.player1_id || !update.player2_id) {
        setError('Seleziona entrambi i giocatori per tutte le coppie modificate');
        return;
      }
      if (update.player1_id === update.player2_id) {
        setError('I due giocatori della stessa coppia devono essere diversi');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/pairs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: pendingUpdates,
          acknowledge_played_matches: acknowledgePlayedMatches,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowPlayedAck(false);
        setEditingPairIds(new Set());
        setDraftEdits({});
        router.refresh();
        return;
      }

      if (data.code === 'NEED_ACK_PLAYED_MATCHES') {
        setShowPlayedAck(true);
        return;
      }

      setError(data.error || 'Errore durante il salvataggio delle coppie');
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

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
    setPairToDelete(pairId);
  }

  async function confirmDeletePair() {
    const pairId = pairToDelete;
    setPairToDelete(null);
    if (!pairId) return;

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
      <ConfirmDialog
        open={pairToDelete !== null}
        title="Elimina coppia"
        message="Vuoi eliminare questa coppia?"
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        onConfirm={confirmDeletePair}
        onCancel={() => setPairToDelete(null)}
      />
      <ConfirmDialog
        open={showPlayedAck}
        title="Conferma modifiche su coppie già giocate"
        message="Almeno una coppia modificata compare in partite già completate. Continuando aggiorni i nomi nel tabellone storico. Vuoi procedere con tutto il batch?"
        confirmLabel="Conferma e salva tutto"
        cancelLabel="Annulla"
        variant="danger"
        onConfirm={() => saveAllPairCompositions(true)}
        onCancel={() => setShowPlayedAck(false)}
      />
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-[#B2FF00]" />
              Gestione Coppie
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              {pairs.length}/{expectedPairs} coppie formate
              {availablePlayers.length > 0 && ` • ${availablePlayers.length} giocatori disponibili`}
            </p>
          </div>
          
          <div className="flex gap-2">
            {pendingUpdates.length > 0 && (
              <button
                onClick={() => saveAllPairCompositions(false)}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
                aria-label="Salva tutte le modifiche alle coppie"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Salva tutte ({pendingUpdates.length})</span>
              </button>
            )}
            {/* Manual pair button */}
            {availablePlayers.length >= 2 && !hasMatches && (
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="btn btn-secondary flex items-center gap-2"
                aria-label="Aggiungi coppia manualmente"
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
                aria-label="Estrazione automatica coppie"
              >
                <Shuffle className="w-4 h-4" />
                <span className="hidden sm:inline">Estrazione Automatica</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {hasMatches && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Tabellone già generato: puoi modificare la composizione delle coppie. Estrazione, aggiunta ed eliminazione restano bloccate.
          </p>
        </div>
      )}

      {/* Extraction confirmation */}
      {showConfirmExtract && (
        <div className="p-4 bg-primary-100/70 dark:bg-surface-dark/30 border-b border-primary-100 dark:border-primary-300/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B2FF00] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-slate-800 dark:text-slate-100">
                Conferma estrazione automatica
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
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
        <div className="p-4 bg-primary-100/70 dark:bg-surface-dark/30 border-b border-primary-100 dark:border-primary-300/50">
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
              {canExtract
                ? ' Usa l\'estrazione automatica o aggiungi manualmente.'
                : ` Servono ${expectedPlayers} partecipanti (attualmente ${participatingUserIds.length}).`}
            </p>
          </div>
        ) : (
          pairs.map(pair => {
            const isEditing = editingPairIds.has(pair.id);
            const draft = draftEdits[pair.id] || { player1_id: pair.player1_id, player2_id: pair.player2_id };
            const selectedPlayer1Id = draft.player1_id;
            const selectedPlayer2Id = draft.player2_id;
            const player1 = userMap.get(selectedPlayer1Id);
            const player2 = userMap.get(selectedPlayer2Id);
            const points1 = rankingMap.get(selectedPlayer1Id) || 0;
            const points2 = rankingMap.get(selectedPlayer2Id) || 0;
            const rowChanged = selectedPlayer1Id !== pair.player1_id || selectedPlayer2Id !== pair.player2_id;

            return (
              <div key={pair.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-surface-dark/30 text-[#202ca1] dark:text-primary-300 text-sm font-medium">
                    Coppia {pair.seed}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Tot: {points1 + points2} pt
                    </span>
                    <button
                      onClick={() => (isEditing ? cancelEditPair(pair) : startEditPair(pair))}
                      disabled={loading}
                      className="p-1.5 rounded hover:bg-primary-100 dark:hover:bg-primary-900/30 text-[#202ca1] transition"
                      title={isEditing ? 'Annulla modifica riga' : 'Modifica composizione coppia'}
                      aria-label={isEditing ? 'Annulla modifica riga' : 'Modifica composizione coppia'}
                    >
                      {isEditing ? <Undo2 className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                    </button>
                    {!hasMatches && (
                      <button
                        onClick={() => handleDeletePair(pair.id)}
                        disabled={loading}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition"
                        title="Elimina coppia"
                        aria-label="Elimina coppia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {rowChanged && (
                  <p className="mb-2 text-xs text-amber-600 dark:text-amber-300">
                    Modifica in bozza non ancora salvata
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={player1?.avatar || null}
                      name={getUserName(selectedPlayer1Id)}
                      size="md" 
                    />
                    <div>
                      {isEditing ? (
                        <select
                          value={selectedPlayer1Id}
                          onChange={(e) => updateDraftPlayer(pair.id, 'player1_id', e.target.value)}
                          className="input"
                        >
                          {participatingUserIds.map((id) => {
                            const score = rankingMap.get(id) || 0;
                            return (
                              <option key={id} value={id}>
                                {getUserName(id)} ({score} pt)
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {getUserName(selectedPlayer1Id)}
                        </p>
                      )}
                      <p className="text-sm text-green-600">{points1} pt</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={player2?.avatar || null}
                      name={getUserName(selectedPlayer2Id)}
                      size="md" 
                    />
                    <div>
                      {isEditing ? (
                        <select
                          value={selectedPlayer2Id}
                          onChange={(e) => updateDraftPlayer(pair.id, 'player2_id', e.target.value)}
                          className="input"
                        >
                          {participatingUserIds.map((id) => {
                            const score = rankingMap.get(id) || 0;
                            return (
                              <option key={id} value={id}>
                                {getUserName(id)} ({score} pt)
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {getUserName(selectedPlayer2Id)}
                        </p>
                      )}
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
