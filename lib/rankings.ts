import type { Match, Pair, TournamentRanking } from './types';
import { POSITION_POINTS } from './types';

/**
 * Calcola le classifiche di un torneo basandosi sui risultati delle partite
 */
export function calculateTournamentRankings(
  pairs: Pair[],
  matches: Match[]
): TournamentRanking[] {
  const rankings: TournamentRanking[] = [];
  const pairPositions = new Map<string, number>();

  const mainMatches = matches.filter(m => m.bracket_type === 'main');
  const consolationMatches = matches.filter(m => m.bracket_type === 'consolation');

  // Finale -> 1° e 2° posto
  const final = mainMatches.find(m => m.round === 'final');
  if (final?.winner_pair_id) {
    pairPositions.set(final.winner_pair_id, 1);
    const loser = final.pair1_id === final.winner_pair_id ? final.pair2_id : final.pair1_id;
    if (loser) pairPositions.set(loser, 2);
  }

  // 3° posto -> 3° e 4° posto
  const thirdPlace = mainMatches.find(m => m.round === 'third_place');
  if (thirdPlace?.winner_pair_id) {
    pairPositions.set(thirdPlace.winner_pair_id, 3);
    const loser = thirdPlace.pair1_id === thirdPlace.winner_pair_id ? thirdPlace.pair2_id : thirdPlace.pair1_id;
    if (loser) pairPositions.set(loser, 4);
  }

  // Finale consolazione -> 5° e 6° posto
  const consolationFinal = consolationMatches.find(m => m.round === 'consolation_final');
  if (consolationFinal?.winner_pair_id) {
    pairPositions.set(consolationFinal.winner_pair_id, 5);
    const loser = consolationFinal.pair1_id === consolationFinal.winner_pair_id ? consolationFinal.pair2_id : consolationFinal.pair1_id;
    if (loser) pairPositions.set(loser, 6);
  }

  // 7° posto -> 7° e 8° posto
  const seventh = consolationMatches.find(m => m.round === 'consolation_seventh');
  if (seventh?.winner_pair_id) {
    pairPositions.set(seventh.winner_pair_id, 7);
    const loser = seventh.pair1_id === seventh.winner_pair_id ? seventh.pair2_id : seventh.pair1_id;
    if (loser) pairPositions.set(loser, 8);
  }

  // Crea i ranking
  for (const pair of pairs) {
    const position = pairPositions.get(pair.id);
    if (position) {
      rankings.push({
        tournament_id: pair.tournament_id,
        pair_id: pair.id,
        position,
        points: POSITION_POINTS[position] || 0,
        is_override: 0,
      });
    }
  }

  return rankings.sort((a, b) => a.position - b.position);
}

/**
 * Verifica se il torneo è completato (tutte le partite hanno un vincitore)
 */
export function isTournamentComplete(matches: Match[]): boolean {
  return matches.length > 0 && matches.every(m => m.winner_pair_id !== null);
}
