'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Pair, Match, User, SaliscendiCourtTier } from '@/lib/types';
import {
  SALISCENDI_TIERS,
  getMaxSaliscendiRoundNumber,
  getSaliscendiMatchesForRound,
} from '@/lib/tournaments/saliscendi';
import { useLiveMatchScores } from '@/hooks/useLiveMatchScores';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Trophy, ChevronRight, Shuffle, ListOrdered } from 'lucide-react';

const TIER_LABEL: Record<SaliscendiCourtTier, string> = {
  oro: 'Campo Oro',
  argento: 'Campo Argento',
  bronzo: 'Campo Bronzo',
};

interface SaliscendiViewProps {
  tournamentId: string;
  pairs: Pair[];
  matches: Match[];
  userMap: Map<string, User>;
  isAdmin: boolean;
  tournamentStatus: string;
  hiddenUserIds?: string[];
}

export function SaliscendiView({
  tournamentId,
  pairs,
  matches,
  userMap,
  isAdmin,
  tournamentStatus,
  hiddenUserIds = [],
}: SaliscendiViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeMatch, setActiveMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<{ pair1: string; pair2: string }>({ pair1: '', pair2: '' });
  const [draft, setDraft] = useState<Record<SaliscendiCourtTier, [string, string]>>({
    oro: ['', ''],
    argento: ['', ''],
    bronzo: ['', ''],
  });
  const [round1IsFinal, setRound1IsFinal] = useState(false);
  const [advanceIsFinal, setAdvanceIsFinal] = useState(false);
  const [forceDialog, setForceDialog] = useState<{ matchId: string; s1: number; s2: number } | null>(null);

  const pairMap = new Map(pairs.map((p) => [p.id, p]));
  const hiddenSet = new Set(hiddenUserIds);
  const { getScore } = useLiveMatchScores(tournamentId);

  const sortedPairs = useMemo(() => [...pairs].sort((a, b) => a.seed - b.seed), [pairs]);

  const maxRound = getMaxSaliscendiRoundNumber(matches);

  function getPairLabel(pairId: string | null): string {
    if (!pairId) return '—';
    const pair = pairMap.get(pairId);
    if (!pair) return '?';
    const p1 = userMap.get(pair.player1_id);
    const p2 = userMap.get(pair.player2_id);
    const p1Hidden = hiddenSet.has(pair.player1_id);
    const p2Hidden = hiddenSet.has(pair.player2_id);
    const n1 = p1Hidden ? 'Giocatore nascosto' : (p1?.nickname || p1?.full_name || '?');
    const n2 = p2Hidden ? 'Giocatore nascosto' : (p2?.nickname || p2?.full_name || '?');
    return `${n1} / ${n2}`;
  }

  function setDraftSlot(tier: SaliscendiCourtTier, slot: 0 | 1, pairId: string) {
    setDraft((prev) => {
      const next = { ...prev, [tier]: [...prev[tier]] } as Record<SaliscendiCourtTier, [string, string]>;
      next[tier][slot] = pairId;
      return next;
    });
  }

  function fillDraftFromSeed() {
    const p = sortedPairs;
    if (p.length !== 6) return;
    setDraft({
      oro: [p[0].id, p[1].id],
      argento: [p[2].id, p[3].id],
      bronzo: [p[4].id, p[5].id],
    });
  }

  function fillDraftRandom() {
    const shuffled = [...sortedPairs].sort(() => Math.random() - 0.5);
    if (shuffled.length !== 6) return;
    setDraft({
      oro: [shuffled[0].id, shuffled[1].id],
      argento: [shuffled[2].id, shuffled[3].id],
      bronzo: [shuffled[4].id, shuffled[5].id],
    });
  }

  async function startRound1() {
    const used = new Set<string>();
    for (const tier of SALISCENDI_TIERS) {
      const [a, b] = draft[tier];
      if (!a || !b) {
        showToast(`Seleziona due coppie per ${TIER_LABEL[tier]}`, 'error');
        return;
      }
      if (a === b) {
        showToast(`Le coppie su ${TIER_LABEL[tier]} devono essere diverse`, 'error');
        return;
      }
      for (const id of [a, b]) {
        if (used.has(id)) {
          showToast('Ogni coppia può essere usata una sola volta', 'error');
          return;
        }
        used.add(id);
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/saliscendi/round1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: {
            oro: draft.oro,
            argento: draft.argento,
            bronzo: draft.bronzo,
          },
          is_final_round: round1IsFinal,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Errore', 'error');
        return;
      }
      showToast('Round 1 creato', 'success');
      router.refresh();
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function advanceRound() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/saliscendi/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_final_round: advanceIsFinal }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Errore', 'error');
        return;
      }
      setAdvanceIsFinal(false);
      showToast(`Creato round ${data.round_number}`, 'success');
      router.refresh();
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function setRoundFinal(roundNumber: number, isFinal: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/saliscendi/round/${roundNumber}/final`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_final: isFinal }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Errore', 'error');
        return;
      }
      showToast(isFinal ? 'Round marcato come ultimo' : 'Flag rimosso', 'success');
      router.refresh();
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function submitWalkover(matchId: string, winningSide: 'pair1' | 'pair2', forceOverride = false) {
    const s1 = winningSide === 'pair1' ? 6 : 0;
    const s2 = winningSide === 'pair2' ? 6 : 0;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score_pair1: s1,
          score_pair2: s2,
          ...(forceOverride ? { force_result_override: true } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.need_force_override && !forceOverride) {
        setForceDialog({ matchId, s1, s2 });
        setLoading(false);
        return;
      }
      if (!data.success) {
        showToast(data.error || 'Errore', 'error');
        return;
      }
      setActiveMatch(null);
      setScores({ pair1: '', pair2: '' });
      setForceDialog(null);
      showToast('Ritiro registrato (walkover 6–0)', 'success');
      router.refresh();
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function submitResult(matchId: string, forceOverride = false) {
    const s1 = parseInt(scores.pair1, 10);
    const s2 = parseInt(scores.pair2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 === s2) {
      showToast('Inserisci punteggi validi (numeri diversi)', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score_pair1: s1,
          score_pair2: s2,
          ...(forceOverride ? { force_result_override: true } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.need_force_override && !forceOverride) {
        setForceDialog({ matchId, s1, s2 });
        setLoading(false);
        return;
      }
      if (!data.success) {
        showToast(data.error || 'Errore', 'error');
        return;
      }
      setActiveMatch(null);
      setScores({ pair1: '', pair2: '' });
      setForceDialog(null);
      router.refresh();
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setLoading(false);
    }
  }

  const currentRoundComplete =
    maxRound > 0 &&
    getSaliscendiMatchesForRound(matches, maxRound).length === 3 &&
    getSaliscendiMatchesForRound(matches, maxRound).every((m) => m.winner_pair_id);
  const currentRoundIsFinal =
    maxRound > 0 &&
    getSaliscendiMatchesForRound(matches, maxRound).some((m) => (m.is_final_round ?? 0) === 1);

  const pairOptions = sortedPairs.map((p) => ({ id: p.id, label: getPairLabel(p.id) }));

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={!!forceDialog}
        title="Forza modifica risultato"
        message="Esistono round successivi: confermando verranno eliminati tutti i match dei round dopo questo. Procedere?"
        confirmLabel="Sì, elimina round successivi"
        cancelLabel="Annulla"
        onConfirm={() => {
          if (forceDialog) void submitResult(forceDialog.matchId, true);
        }}
        onCancel={() => setForceDialog(null)}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <strong>Saliscendi.</strong> La classifica ATP si basa solo sull&apos;<strong>ultimo round</strong> che
        marchi come finale e sui risultati di quel round. Inserisci i <strong>game vinti</strong> a fine match (regola
        del fischio e punto d&apos;oro si applicano sul campo; in app va il risultato finale già consolidato).
      </div>

      {maxRound === 0 && isAdmin && tournamentStatus !== 'completed' && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Setup Round 1
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Assegna le 6 coppie ai tre campi (Oro, Argento, Bronzo). Puoi usare i suggerimenti da seed o casualità.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary text-sm inline-flex items-center gap-1" onClick={fillDraftFromSeed}>
              <ListOrdered className="w-4 h-4" />
              Da seed
            </button>
            <button type="button" className="btn btn-secondary text-sm inline-flex items-center gap-1" onClick={fillDraftRandom}>
              <Shuffle className="w-4 h-4" />
              Sorteggio
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {SALISCENDI_TIERS.map((tier) => (
              <div key={tier} className="rounded-lg border border-slate-200 dark:border-slate-600 p-3 space-y-2">
                <div className="font-medium text-slate-800 dark:text-slate-100">{TIER_LABEL[tier]}</div>
                <label className="block text-xs text-slate-500">Coppia 1</label>
                <select
                  className="input w-full text-sm"
                  value={draft[tier][0]}
                  onChange={(e) => setDraftSlot(tier, 0, e.target.value)}
                >
                  <option value="">—</option>
                  {pairOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label className="block text-xs text-slate-500">Coppia 2</label>
                <select
                  className="input w-full text-sm"
                  value={draft[tier][1]}
                  onChange={(e) => setDraftSlot(tier, 1, e.target.value)}
                >
                  <option value="">—</option>
                  {pairOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={round1IsFinal} onChange={(e) => setRound1IsFinal(e.target.checked)} />
            Questo Round 1 è anche l&apos;ultimo round (classifica subito dopo i 3 risultati)
          </label>
          <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void startRound1()}>
            {loading ? 'Salvataggio...' : 'Avvia Round 1'}
          </button>
        </div>
      )}

      {maxRound > 0 && (
        <div className="space-y-8">
          {Array.from({ length: maxRound }, (_, i) => i + 1).map((rn) => {
            const roundMatches = getSaliscendiMatchesForRound(matches, rn);
            const isFinal = roundMatches.some((m) => (m.is_final_round ?? 0) === 1);
            return (
              <div key={rn} className="card p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Round {rn}
                    {isFinal && (
                      <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                        Ultimo round (classifica)
                      </span>
                    )}
                  </h3>
                  {isAdmin && tournamentStatus !== 'completed' && !isFinal && (
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      disabled={loading}
                      onClick={() => void setRoundFinal(rn, !isFinal)}
                    >
                      {isFinal ? 'Rimuovi flag ultimo round' : 'Segna come ultimo round'}
                    </button>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {SALISCENDI_TIERS.map((tier) => {
                    const m = roundMatches.find((x) => x.court_tier === tier);
                    if (!m) return null;
                    const live = getScore(m.id);
                    const score1 = live?.score_pair1 ?? m.score_pair1;
                    const score2 = live?.score_pair2 ?? m.score_pair2;
                    const winnerId = live?.winner_pair_id ?? m.winner_pair_id;
                    const isEditing = activeMatch === m.id;
                    const canEditMatch = isAdmin && tournamentStatus !== 'completed' && m.pair1_id && m.pair2_id;

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg border ${
                          winnerId
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <div className="text-xs font-medium text-slate-500 mb-1">{TIER_LABEL[tier]}</div>
                        <div className="text-sm text-slate-800 dark:text-slate-100 mb-1">{getPairLabel(m.pair1_id)}</div>
                        <div className="text-xs text-slate-500 mb-2">vs</div>
                        <div className="text-sm text-slate-800 dark:text-slate-100 mb-2">{getPairLabel(m.pair2_id)}</div>
                        {winnerId != null && (
                          <div className="text-sm font-medium text-green-800 dark:text-green-200">
                            {score1} — {score2}
                          </div>
                        )}
                        {canEditMatch && !isEditing && (
                          <button
                            type="button"
                            className="mt-2 btn btn-secondary text-xs"
                            onClick={() => {
                              setActiveMatch(m.id);
                              setScores({ pair1: score1 != null ? String(score1) : '', pair2: score2 != null ? String(score2) : '' });
                            }}
                          >
                            {winnerId ? 'Modifica risultato' : 'Inserisci risultato'}
                          </button>
                        )}
                        {isEditing && (
                          <div className="mt-2 space-y-2">
                            <div className="flex gap-2 items-center">
                              <input
                                className="input w-16 text-center"
                                inputMode="numeric"
                                value={scores.pair1}
                                onChange={(e) => setScores((s) => ({ ...s, pair1: e.target.value }))}
                              />
                              <span>—</span>
                              <input
                                className="input w-16 text-center"
                                inputMode="numeric"
                                value={scores.pair2}
                                onChange={(e) => setScores((s) => ({ ...s, pair2: e.target.value }))}
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-primary text-xs"
                                disabled={loading}
                                onClick={() => void submitResult(m.id)}
                              >
                                Salva
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary text-xs"
                                disabled={loading}
                                onClick={() => void submitWalkover(m.id, 'pair1')}
                              >
                                WO: vince coppia 1 (6–0)
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary text-xs"
                                disabled={loading}
                                onClick={() => void submitWalkover(m.id, 'pair2')}
                              >
                                WO: vince coppia 2 (0–6)
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary text-xs"
                                onClick={() => {
                                  setActiveMatch(null);
                                  setScores({ pair1: '', pair2: '' });
                                }}
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && tournamentStatus !== 'completed' && maxRound > 0 && currentRoundComplete && !currentRoundIsFinal && (
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="font-medium text-slate-800 dark:text-slate-100">Round successivo</div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Movimenti sali/scendi applicati automaticamente. Spunta se il prossimo round sarà l&apos;ultimo.
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={advanceIsFinal} onChange={(e) => setAdvanceIsFinal(e.target.checked)} />
              Il prossimo round è l&apos;ultimo
            </label>
          </div>
          <button type="button" className="btn btn-primary inline-flex items-center gap-2 shrink-0" disabled={loading} onClick={() => void advanceRound()}>
            <ChevronRight className="w-4 h-4" />
            {loading ? '...' : 'Avanza round'}
          </button>
        </div>
      )}
    </div>
  );
}
