import type { Match, MatchRound, BracketType, Pair } from './types';

export interface GeneratedMatch {
  round: MatchRound;
  bracket_type: BracketType;
  pair1_id: string | null;
  pair2_id: string | null;
  score_pair1: number | null;
  score_pair2: number | null;
  winner_pair_id: string | null;
  order_in_round: number;
}

/**
 * Genera il tabellone del torneo
 * - 8 coppie
 * - Quarti, Semifinali, Finale
 * - Tabellone di consolazione per chi perde ai quarti
 */
export function generateBracket(pairs: Pair[]): GeneratedMatch[] {
  if (pairs.length !== 8) {
    throw new Error(`Servono 8 coppie, trovate ${pairs.length}`);
  }

  // Ordina per seed
  const sortedPairs = [...pairs].sort((a, b) => a.seed - b.seed);

  const matches: GeneratedMatch[] = [];

  // Schema classico 8 coppie:
  // QF1: 1 vs 8
  // QF2: 4 vs 5
  // QF3: 2 vs 7
  // QF4: 3 vs 6
  // SF1: QF1 winner vs QF2 winner
  // SF2: QF3 winner vs QF4 winner
  // Final: SF1 winner vs SF2 winner
  // 3rd place: SF1 loser vs SF2 loser

  const qfPairings = [
    [sortedPairs[0], sortedPairs[7]], // 1 vs 8
    [sortedPairs[3], sortedPairs[4]], // 4 vs 5
    [sortedPairs[1], sortedPairs[6]], // 2 vs 7
    [sortedPairs[2], sortedPairs[5]], // 3 vs 6
  ];

  // Quarti di finale (main bracket)
  qfPairings.forEach(([p1, p2], i) => {
    matches.push({
      round: 'quarterfinal',
      bracket_type: 'main',
      pair1_id: p1.id,
      pair2_id: p2.id,
      score_pair1: null,
      score_pair2: null,
      winner_pair_id: null,
      order_in_round: i,
    });
  });

  // Semifinali (main bracket) - coppie da determinare
  matches.push({
    round: 'semifinal',
    bracket_type: 'main',
    pair1_id: null, // Winner QF1
    pair2_id: null, // Winner QF2
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 0,
  });

  matches.push({
    round: 'semifinal',
    bracket_type: 'main',
    pair1_id: null, // Winner QF3
    pair2_id: null, // Winner QF4
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 1,
  });

  // Finale (1° e 2° posto)
  matches.push({
    round: 'final',
    bracket_type: 'main',
    pair1_id: null, // Winner SF1
    pair2_id: null, // Winner SF2
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 0,
  });

  // 3° e 4° posto
  matches.push({
    round: 'third_place',
    bracket_type: 'main',
    pair1_id: null, // Loser SF1
    pair2_id: null, // Loser SF2
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 0,
  });

  // Consolation bracket (per i perdenti dei quarti)
  // Semi consolazione
  matches.push({
    round: 'consolation_semi',
    bracket_type: 'consolation',
    pair1_id: null, // Loser QF1
    pair2_id: null, // Loser QF2
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 0,
  });

  matches.push({
    round: 'consolation_semi',
    bracket_type: 'consolation',
    pair1_id: null, // Loser QF3
    pair2_id: null, // Loser QF4
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 1,
  });

  // Finale consolazione (5° e 6° posto)
  matches.push({
    round: 'consolation_final',
    bracket_type: 'consolation',
    pair1_id: null, // Winner CS1
    pair2_id: null, // Winner CS2
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 0,
  });

  // 7° e 8° posto
  matches.push({
    round: 'consolation_seventh',
    bracket_type: 'consolation',
    pair1_id: null, // Loser CS1
    pair2_id: null, // Loser CS2
    score_pair1: null,
    score_pair2: null,
    winner_pair_id: null,
    order_in_round: 0,
  });

  return matches;
}

/**
 * Propaga i risultati dopo l'inserimento di un punteggio
 */
export function propagateResults(matches: Match[]): { matchId: string; pair1_id: string | null; pair2_id: string | null }[] {
  const updates: { matchId: string; pair1_id: string | null; pair2_id: string | null }[] = [];

  const mainMatches = matches.filter(m => m.bracket_type === 'main');
  const consolationMatches = matches.filter(m => m.bracket_type === 'consolation');

  // Quarti -> Semifinali (main)
  const qf = mainMatches.filter(m => m.round === 'quarterfinal').sort((a, b) => a.order_in_round - b.order_in_round);
  const sf = mainMatches.filter(m => m.round === 'semifinal').sort((a, b) => a.order_in_round - b.order_in_round);

  // SF1 riceve vincitori QF1 e QF2
  if (sf[0] && qf[0] && qf[1]) {
    const newPair1 = qf[0].winner_pair_id;
    const newPair2 = qf[1].winner_pair_id;
    if (sf[0].pair1_id !== newPair1 || sf[0].pair2_id !== newPair2) {
      updates.push({ matchId: sf[0].id, pair1_id: newPair1, pair2_id: newPair2 });
    }
  }

  // SF2 riceve vincitori QF3 e QF4
  if (sf[1] && qf[2] && qf[3]) {
    const newPair1 = qf[2].winner_pair_id;
    const newPair2 = qf[3].winner_pair_id;
    if (sf[1].pair1_id !== newPair1 || sf[1].pair2_id !== newPair2) {
      updates.push({ matchId: sf[1].id, pair1_id: newPair1, pair2_id: newPair2 });
    }
  }

  // Finale riceve vincitori SF1 e SF2
  const final = mainMatches.find(m => m.round === 'final');
  if (final && sf[0] && sf[1]) {
    const newPair1 = sf[0].winner_pair_id;
    const newPair2 = sf[1].winner_pair_id;
    if (final.pair1_id !== newPair1 || final.pair2_id !== newPair2) {
      updates.push({ matchId: final.id, pair1_id: newPair1, pair2_id: newPair2 });
    }
  }

  // 3° posto riceve perdenti SF1 e SF2
  const thirdPlace = mainMatches.find(m => m.round === 'third_place');
  if (thirdPlace && sf[0] && sf[1]) {
    const loser1 = sf[0].winner_pair_id ? (sf[0].pair1_id === sf[0].winner_pair_id ? sf[0].pair2_id : sf[0].pair1_id) : null;
    const loser2 = sf[1].winner_pair_id ? (sf[1].pair1_id === sf[1].winner_pair_id ? sf[1].pair2_id : sf[1].pair1_id) : null;
    if (thirdPlace.pair1_id !== loser1 || thirdPlace.pair2_id !== loser2) {
      updates.push({ matchId: thirdPlace.id, pair1_id: loser1, pair2_id: loser2 });
    }
  }

  // Consolation: Semi ricevono perdenti QF
  const cs = consolationMatches.filter(m => m.round === 'consolation_semi').sort((a, b) => a.order_in_round - b.order_in_round);
  
  // CS1 riceve perdenti QF1 e QF2
  if (cs[0] && qf[0] && qf[1]) {
    const loser1 = qf[0].winner_pair_id ? (qf[0].pair1_id === qf[0].winner_pair_id ? qf[0].pair2_id : qf[0].pair1_id) : null;
    const loser2 = qf[1].winner_pair_id ? (qf[1].pair1_id === qf[1].winner_pair_id ? qf[1].pair2_id : qf[1].pair1_id) : null;
    if (cs[0].pair1_id !== loser1 || cs[0].pair2_id !== loser2) {
      updates.push({ matchId: cs[0].id, pair1_id: loser1, pair2_id: loser2 });
    }
  }

  // CS2 riceve perdenti QF3 e QF4
  if (cs[1] && qf[2] && qf[3]) {
    const loser1 = qf[2].winner_pair_id ? (qf[2].pair1_id === qf[2].winner_pair_id ? qf[2].pair2_id : qf[2].pair1_id) : null;
    const loser2 = qf[3].winner_pair_id ? (qf[3].pair1_id === qf[3].winner_pair_id ? qf[3].pair2_id : qf[3].pair1_id) : null;
    if (cs[1].pair1_id !== loser1 || cs[1].pair2_id !== loser2) {
      updates.push({ matchId: cs[1].id, pair1_id: loser1, pair2_id: loser2 });
    }
  }

  // Finale consolazione riceve vincitori CS1 e CS2
  const cfinal = consolationMatches.find(m => m.round === 'consolation_final');
  if (cfinal && cs[0] && cs[1]) {
    const newPair1 = cs[0].winner_pair_id;
    const newPair2 = cs[1].winner_pair_id;
    if (cfinal.pair1_id !== newPair1 || cfinal.pair2_id !== newPair2) {
      updates.push({ matchId: cfinal.id, pair1_id: newPair1, pair2_id: newPair2 });
    }
  }

  // 7° posto riceve perdenti CS1 e CS2
  const seventh = consolationMatches.find(m => m.round === 'consolation_seventh');
  if (seventh && cs[0] && cs[1]) {
    const loser1 = cs[0].winner_pair_id ? (cs[0].pair1_id === cs[0].winner_pair_id ? cs[0].pair2_id : cs[0].pair1_id) : null;
    const loser2 = cs[1].winner_pair_id ? (cs[1].pair1_id === cs[1].winner_pair_id ? cs[1].pair2_id : cs[1].pair1_id) : null;
    if (seventh.pair1_id !== loser1 || seventh.pair2_id !== loser2) {
      updates.push({ matchId: seventh.id, pair1_id: loser1, pair2_id: loser2 });
    }
  }

  return updates;
}

export const ROUND_LABELS: Record<MatchRound, string> = {
  quarterfinal: 'Quarti di Finale',
  semifinal: 'Semifinali',
  final: 'Finale',
  third_place: '3° e 4° posto',
  consolation_semi: 'Semi Consolazione',
  consolation_final: '5° e 6° posto',
  consolation_seventh: '7° e 8° posto',
};
