'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Pair, Match, User } from '@/lib/types';
import { ROUND_LABELS } from '@/lib/bracket';
import { Play, Check, Trophy, RefreshCw, Users, X } from 'lucide-react';

interface BracketViewProps {
  tournamentId: string;
  pairs: Pair[];
  matches: Match[];
  userMap: Map<string, User>;
  isAdmin: boolean;
  tournamentStatus: string;
  hiddenUserIds?: string[];
}

export function BracketView({ 
  tournamentId, 
  pairs, 
  matches, 
  userMap, 
  isAdmin,
  tournamentStatus,
  hiddenUserIds = []
}: BracketViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeMatch, setActiveMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<{ pair1: string; pair2: string }>({ pair1: '', pair2: '' });
  
  // Global quarterfinal editing mode
  const [editingQuarterfinals, setEditingQuarterfinals] = useState(false);
  // Store pair selections for all 4 quarterfinal matches: { matchId: { pair1: string, pair2: string } }
  const [quarterfinalSelections, setQuarterfinalSelections] = useState<Record<string, { pair1: string; pair2: string }>>({});

  const pairMap = new Map(pairs.map(p => [p.id, p]));
  const hiddenSet = new Set(hiddenUserIds);

  function getPairName(pairId: string | null): string {
    if (!pairId) return 'TBD';
    const pair = pairMap.get(pairId);
    if (!pair) return 'TBD';
    const p1 = userMap.get(pair.player1_id);
    const p2 = userMap.get(pair.player2_id);
    // Check if either player is hidden
    const p1Hidden = hiddenSet.has(pair.player1_id);
    const p2Hidden = hiddenSet.has(pair.player2_id);
    const n1 = p1Hidden ? 'Giocatore nascosto' : (p1?.nickname || p1?.full_name || '?');
    const n2 = p2Hidden ? 'Giocatore nascosto' : (p2?.nickname || p2?.full_name || '?');
    return `${n1} / ${n2}`;
  }

  async function generateBracket() {
    setLoading(true);
    try {
      await fetch(`/api/tournaments/${tournamentId}/bracket/generate`, { method: 'POST' });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function submitResult(matchId: string) {
    const s1 = parseInt(scores.pair1);
    const s2 = parseInt(scores.pair2);
    
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 === s2) {
      alert('Inserisci punteggi validi (numeri diversi)');
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score_pair1: s1, score_pair2: s2 }),
      });
      setActiveMatch(null);
      setScores({ pair1: '', pair2: '' });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Start editing all quarterfinals - reset all selections to empty
  function startEditingQuarterfinals() {
    const qfMatches = matches.filter(m => m.round === 'quarterfinal');
    const selections: Record<string, { pair1: string; pair2: string }> = {};
    qfMatches.forEach(m => {
      selections[m.id] = { pair1: '', pair2: '' };
    });
    setQuarterfinalSelections(selections);
    setEditingQuarterfinals(true);
  }

  function cancelEditingQuarterfinals() {
    setEditingQuarterfinals(false);
    setQuarterfinalSelections({});
  }

  // Get all pairs already selected in the current editing session
  function getSelectedPairsInEditing(excludeMatchId?: string): Set<string> {
    const selected = new Set<string>();
    Object.entries(quarterfinalSelections).forEach(([matchId, sel]) => {
      if (matchId !== excludeMatchId) {
        if (sel.pair1) selected.add(sel.pair1);
        if (sel.pair2) selected.add(sel.pair2);
      }
    });
    return selected;
  }

  // Save all quarterfinal pair assignments
  async function saveAllQuarterfinals() {
    // Validate all matches have both pairs selected
    const qfMatches = matches.filter(m => m.round === 'quarterfinal');
    
    for (const match of qfMatches) {
      const sel = quarterfinalSelections[match.id];
      if (!sel?.pair1 || !sel?.pair2) {
        alert('Seleziona entrambe le coppie per tutti i quarti di finale');
        return;
      }
      if (sel.pair1 === sel.pair2) {
        alert('Le due coppie in ogni match devono essere diverse');
        return;
      }
    }

    // Check no pair is used twice
    const allSelected = new Set<string>();
    for (const match of qfMatches) {
      const sel = quarterfinalSelections[match.id];
      if (allSelected.has(sel.pair1) || allSelected.has(sel.pair2)) {
        alert('Ogni coppia può essere assegnata ad un solo match');
        return;
      }
      allSelected.add(sel.pair1);
      allSelected.add(sel.pair2);
    }

    setLoading(true);
    try {
      // STEP 1: Clear all quarterfinal pairs first to avoid conflicts
      for (const match of qfMatches) {
        await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}/pairs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair1_id: null, pair2_id: null }),
        });
      }
      
      // STEP 2: Now save the new assignments
      for (const match of qfMatches) {
        const sel = quarterfinalSelections[match.id];
        const res = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}/pairs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair1_id: sel.pair1, pair2_id: sel.pair2 }),
        });
        const data = await res.json();
        if (!data.success) {
          alert(data.error || 'Errore durante l\'assegnazione');
          setLoading(false);
          return;
        }
      }
      setEditingQuarterfinals(false);
      setQuarterfinalSelections({});
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  if (matches.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-700 dark:text-slate-300" />
        <p className="text-slate-700 dark:text-slate-300 mb-4">
          Il tabellone non è ancora stato generato
        </p>
        {isAdmin && pairs.length === 8 && (
          <button
            onClick={generateBracket}
            disabled={loading}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Generazione...' : 'Genera Tabellone'}
          </button>
        )}
      </div>
    );
  }

  const mainMatches = matches.filter(m => m.bracket_type === 'main');
  const consolationMatches = matches.filter(m => m.bracket_type === 'consolation');
  const quarterfinalMatches = mainMatches.filter(m => m.round === 'quarterfinal');
  
  // Check if any quarterfinal has a result (if so, cannot edit pairs)
  const anyQuarterfinalHasResult = quarterfinalMatches.some(m => m.winner_pair_id !== null);
  const canEditQuarterfinals = isAdmin && tournamentStatus !== 'completed' && !anyQuarterfinalHasResult;

  const renderMatch = (match: Match) => {
    const isEditing = activeMatch === match.id;
    const isQuarterfinal = match.round === 'quarterfinal';
    const isEditingThisQF = editingQuarterfinals && isQuarterfinal;
    const canEdit = isAdmin && tournamentStatus !== 'completed' && match.pair1_id && match.pair2_id;
    const isComplete = match.winner_pair_id !== null;

    // Get available pairs for this match in editing mode
    const selectedElsewhere = getSelectedPairsInEditing(match.id);
    const currentSelection = quarterfinalSelections[match.id] || { pair1: '', pair2: '' };
    const availablePairs = pairs.filter(p => !selectedElsewhere.has(p.id));

    return (
      <div 
        key={match.id} 
        className={`p-3 rounded-lg border ${
          isComplete 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-white dark:bg-white/90 border-primary-100'
        }`}
      >
        {isEditingThisQF ? (
          // Quarterfinal editing mode - show dropdowns
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Coppia 1</label>
              <select
                value={currentSelection.pair1}
                onChange={(e) => setQuarterfinalSelections(prev => ({
                  ...prev,
                  [match.id]: { ...prev[match.id], pair1: e.target.value }
                }))}
                className="input text-sm py-1"
              >
                <option value="">Seleziona...</option>
                {availablePairs.filter(p => p.id !== currentSelection.pair2).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.seed}. {getPairName(p.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Coppia 2</label>
              <select
                value={currentSelection.pair2}
                onChange={(e) => setQuarterfinalSelections(prev => ({
                  ...prev,
                  [match.id]: { ...prev[match.id], pair2: e.target.value }
                }))}
                className="input text-sm py-1"
              >
                <option value="">Seleziona...</option>
                {availablePairs.filter(p => p.id !== currentSelection.pair1).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.seed}. {getPairName(p.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            {/* Pair 1 */}
            <div className={`flex items-center justify-between py-1 ${
              match.winner_pair_id === match.pair1_id ? 'font-bold text-green-600 dark:text-green-400' : ''
            }`}>
              <span className="truncate">{getPairName(match.pair1_id)}</span>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={scores.pair1}
                  onChange={(e) => setScores(s => ({ ...s, pair1: e.target.value }))}
                  className="w-12 px-2 py-1 text-center rounded border border-primary-100 bg-white text-slate-900 dark:text-slate-900"
                />
              ) : (
                <span className="font-mono">{match.score_pair1 ?? '-'}</span>
              )}
            </div>

            {/* Pair 2 */}
            <div className={`flex items-center justify-between py-1 border-t border-slate-200 dark:border-slate-700 ${
              match.winner_pair_id === match.pair2_id ? 'font-bold text-green-600 dark:text-green-400' : ''
            }`}>
              <span className="truncate">{getPairName(match.pair2_id)}</span>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={scores.pair2}
                  onChange={(e) => setScores(s => ({ ...s, pair2: e.target.value }))}
                  className="w-12 px-2 py-1 text-center rounded border border-primary-100 bg-white text-slate-900 dark:text-slate-900"
                />
              ) : (
                <span className="font-mono">{match.score_pair2 ?? '-'}</span>
              )}
            </div>

            {/* Result editing actions */}
            {canEdit && !editingQuarterfinals && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitResult(match.id)}
                      disabled={loading}
                      className="btn btn-primary text-xs py-1 flex-1"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Salva
                    </button>
                    <button
                      onClick={() => { setActiveMatch(null); setScores({ pair1: '', pair2: '' }); }}
                      className="btn btn-secondary text-xs py-1"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActiveMatch(match.id);
                      setScores({
                        pair1: match.score_pair1?.toString() || '',
                        pair2: match.score_pair2?.toString() || '',
                      });
                    }}
                    className="btn btn-secondary text-xs py-1 w-full"
                  >
                    {isComplete ? 'Modifica Risultato' : 'Inserisci risultato'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderRound = (roundMatches: Match[], roundKey: string) => (
    <div key={roundKey} className="space-y-3">
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {ROUND_LABELS[roundKey as keyof typeof ROUND_LABELS] || roundKey}
      </h4>
      {roundMatches.sort((a, b) => a.order_in_round - b.order_in_round).map(renderMatch)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main bracket */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tabellone Principale</h3>
          <div className="flex items-center gap-2">
            {/* Edit quarterfinals button */}
            {canEditQuarterfinals && !editingQuarterfinals && (
              <button
                onClick={startEditingQuarterfinals}
                className="btn btn-secondary text-sm flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Modifica Coppie
              </button>
            )}
            {isAdmin && !editingQuarterfinals && (
              <button
                onClick={generateBracket}
                disabled={loading}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Rigenerazione...' : 'Rigenera Tabellone'}
              </button>
            )}
          </div>
        </div>
        
        {/* Editing quarterfinals banner */}
        {editingQuarterfinals && (
          <div className="p-4 bg-primary-50 border-b border-primary-100">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-[#202ca1]">
                Modalità Modifica Coppie
              </p>
            </div>
            <p className="text-sm text-[#76b300] mb-3">
              Seleziona le coppie per ogni quarto di finale, poi clicca &quot;Salva Tutto&quot;.
            </p>
            <div className="flex gap-2">
              <button
                onClick={saveAllQuarterfinals}
                disabled={loading}
                className="btn btn-primary text-sm flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Salvataggio...' : 'Salva Tutto'}
              </button>
              <button
                onClick={cancelEditingQuarterfinals}
                disabled={loading}
                className="btn btn-secondary text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Annulla
              </button>
            </div>
          </div>
        )}
        
        <div className="p-4 grid md:grid-cols-4 gap-4">
          {renderRound(mainMatches.filter(m => m.round === 'quarterfinal'), 'quarterfinal')}
          {renderRound(mainMatches.filter(m => m.round === 'semifinal'), 'semifinal')}
          {renderRound(mainMatches.filter(m => m.round === 'final'), 'final')}
          {renderRound(mainMatches.filter(m => m.round === 'third_place'), 'third_place')}
        </div>
      </div>

      {/* Consolation bracket */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tabellone Consolazione</h3>
        </div>
        <div className="p-4 grid md:grid-cols-3 gap-4">
          {renderRound(consolationMatches.filter(m => m.round === 'consolation_semi'), 'consolation_semi')}
          {renderRound(consolationMatches.filter(m => m.round === 'consolation_final'), 'consolation_final')}
          {renderRound(consolationMatches.filter(m => m.round === 'consolation_seventh'), 'consolation_seventh')}
        </div>
      </div>
    </div>
  );
}
