import type { Match, Pair, TournamentRanking, TournamentCategory } from './types';
import { getPositionPoints } from './types';

/**
 * Calcola le classifiche di un torneo basandosi sui risultati delle partite.
 * I punti dipendono dalla categoria del torneo (Grande Slam / Master 1000).
 */
export function calculateTournamentRankings(
  pairs: Pair[],
  matches: Match[],
  category: TournamentCategory = 'master_1000'
): TournamentRanking[] {
  const mainMatches = matches.filter(m => m.bracket_type === 'main');
  const consolationMatches = matches.filter(m => m.bracket_type === 'consolation');

  // Formato girone all'italiana (4 coppie, round_robin)
  const hasRoundRobin = mainMatches.some(m => m.round === 'round_robin');
  if (hasRoundRobin) {
    const standingsMap = new Map<string, {
      wins: number;
      losses: number;
      gamesFor: number;
      gamesAgainst: number;
    }>();

    for (const pair of pairs) {
      standingsMap.set(pair.id, {
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
      });
    }

    for (const m of mainMatches.filter(m => m.round === 'round_robin')) {
      if (!m.pair1_id || !m.pair2_id) continue;
      if (m.score_pair1 == null || m.score_pair2 == null) continue;

      const s1 = standingsMap.get(m.pair1_id);
      const s2 = standingsMap.get(m.pair2_id);
      if (!s1 || !s2) continue;

      s1.gamesFor += m.score_pair1;
      s1.gamesAgainst += m.score_pair2;
      s2.gamesFor += m.score_pair2;
      s2.gamesAgainst += m.score_pair1;

      if (m.score_pair1 > m.score_pair2) {
        s1.wins += 1;
        s2.losses += 1;
      } else if (m.score_pair2 > m.score_pair1) {
        s2.wins += 1;
        s1.losses += 1;
      }
      // Pareggi non previsti: vittoria vale 1, sconfitta 0
    }

    const rows = Array.from(standingsMap.entries()).map(([pairId, s]) => {
      const pair = pairs.find(p => p.id === pairId);
      const seed = pair?.seed ?? 999;
      const pointsGirone = s.wins; // vittoria = 1, sconfitta = 0
      return {
        pairId,
        seed,
        wins: s.wins,
        losses: s.losses,
        gamesFor: s.gamesFor,
        gamesAgainst: s.gamesAgainst,
        diff: s.gamesFor - s.gamesAgainst,
        pointsGirone,
      };
    }).sort((a, b) => {
      if (b.pointsGirone !== a.pointsGirone) return b.pointsGirone - a.pointsGirone;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return a.seed - b.seed;
    });

    const rankings: TournamentRanking[] = [];
    rows.forEach((row, idx) => {
      const position = idx + 1; // 1–4
      rankings.push({
        tournament_id: pairs[0]?.tournament_id ?? '',
        pair_id: row.pairId,
        position,
        points: getPositionPoints(category, position),
        is_override: 0,
      });
    });

    return rankings;
  }

  const rankings: TournamentRanking[] = [];
  const pairPositions = new Map<string, number>();

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
        points: getPositionPoints(category, position),
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
