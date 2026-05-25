import type { Match, Pair, SaliscendiCourtTier, TournamentCategory, TournamentRanking } from '../types';
import { getPositionPoints } from '../types';

export const SALISCENDI_TIERS: SaliscendiCourtTier[] = ['oro', 'argento', 'bronzo'];

export function isSaliscendiMatch(m: Pick<Match, 'round'>): boolean {
  return m.round === 'saliscendi';
}

/** Match Saliscendi del torneo, ordinati per round poi tier. */
export function getSaliscendiMatches(matches: Match[]): Match[] {
  return matches
    .filter(isSaliscendiMatch)
    .sort((a, b) => {
      const ra = a.round_number ?? 0;
      const rb = b.round_number ?? 0;
      if (ra !== rb) return ra - rb;
      return (a.order_in_round ?? 0) - (b.order_in_round ?? 0);
    });
}

export function getMaxSaliscendiRoundNumber(matches: Match[]): number {
  let max = 0;
  for (const m of matches) {
    if (!isSaliscendiMatch(m)) continue;
    const n = m.round_number ?? 0;
    if (n > max) max = n;
  }
  return max;
}

/** Ultimo round marcato come finale (is_final_round sui match). */
export function getFinalSaliscendiRoundNumber(matches: Match[]): number | null {
  let found: number | null = null;
  for (const m of matches) {
    if (!isSaliscendiMatch(m)) continue;
    if ((m.is_final_round ?? 0) === 1) {
      const n = m.round_number ?? 0;
      if (found === null || n > found) found = n;
    }
  }
  return found;
}

export function getSaliscendiMatchesForRound(matches: Match[], roundNumber: number): Match[] {
  const out: Match[] = [];
  for (const tier of SALISCENDI_TIERS) {
    const m = matches.find(
      (x) => isSaliscendiMatch(x) && (x.round_number ?? 0) === roundNumber && x.court_tier === tier
    );
    if (m) out.push(m);
  }
  return out;
}

function loserPairId(m: Match): string | null {
  if (!m.winner_pair_id || !m.pair1_id || !m.pair2_id) return null;
  return m.pair1_id === m.winner_pair_id ? m.pair2_id : m.pair1_id;
}

/**
 * Calcola le coppie per il round successivo (movimenti sali/scendi).
 * Richiede 3 match completati del round corrente (oro, argento, bronzo).
 */
export function computeNextSaliscendiPairings(matchesOfRound: Match[]): {
  tier: SaliscendiCourtTier;
  pair1_id: string;
  pair2_id: string;
}[] {
  const byTier = new Map<SaliscendiCourtTier, Match>();
  for (const m of matchesOfRound) {
    const t = m.court_tier as SaliscendiCourtTier | null | undefined;
    if (!t || !SALISCENDI_TIERS.includes(t)) continue;
    byTier.set(t, m);
  }
  for (const tier of SALISCENDI_TIERS) {
    const m = byTier.get(tier);
    if (!m?.winner_pair_id || !m.pair1_id || !m.pair2_id) {
      throw new Error(`Match ${tier} incompleto o senza vincitore`);
    }
  }
  const oro = byTier.get('oro')!;
  const argento = byTier.get('argento')!;
  const bronzo = byTier.get('bronzo')!;
  const wOro = oro.winner_pair_id!;
  const wArg = argento.winner_pair_id!;
  const wBro = bronzo.winner_pair_id!;
  const lOro = loserPairId(oro)!;
  const lArg = loserPairId(argento)!;
  const lBro = loserPairId(bronzo)!;
  return [
    { tier: 'oro', pair1_id: wOro, pair2_id: wArg },
    { tier: 'argento', pair1_id: lOro, pair2_id: wBro },
    { tier: 'bronzo', pair1_id: lArg, pair2_id: lBro },
  ];
}

/**
 * Classifica finale da 6 posizioni dall'ultimo round marcato is_final_round.
 */
export function calculateSaliscendiRankings(
  pairs: Pair[],
  matches: Match[],
  category: TournamentCategory = 'master_1000'
): TournamentRanking[] {
  const finalRound = getFinalSaliscendiRoundNumber(matches);
  if (finalRound === null) {
    throw new Error('Nessun round finale marcato per il Saliscendi');
  }
  const roundMatches = getSaliscendiMatchesForRound(matches, finalRound);
  if (roundMatches.length !== 3) {
    throw new Error('Round finale incompleto: servono 3 match (oro, argento, bronzo)');
  }
  const tournamentId = pairs[0]?.tournament_id ?? '';
  const rankings: TournamentRanking[] = [];

  const pushTwo = (tier: SaliscendiCourtTier, posWin: number, posLoss: number) => {
    const m = roundMatches.find((x) => x.court_tier === tier);
    if (!m?.winner_pair_id) throw new Error(`Match ${tier} senza risultato`);
    const loser = loserPairId(m);
    if (!loser) throw new Error(`Match ${tier}: perdente non determinabile`);
    rankings.push({
      tournament_id: tournamentId,
      pair_id: m.winner_pair_id,
      position: posWin,
      points: getPositionPoints(category, posWin),
      is_override: 0,
    });
    rankings.push({
      tournament_id: tournamentId,
      pair_id: loser,
      position: posLoss,
      points: getPositionPoints(category, posLoss),
      is_override: 0,
    });
  };

  pushTwo('oro', 1, 2);
  pushTwo('argento', 3, 4);
  pushTwo('bronzo', 5, 6);

  return rankings.sort((a, b) => a.position - b.position);
}

export function isSaliscendiTournamentComplete(matches: Match[]): boolean {
  const finalRound = getFinalSaliscendiRoundNumber(matches);
  if (finalRound === null) return false;
  const roundMatches = getSaliscendiMatchesForRound(matches, finalRound);
  if (roundMatches.length !== 3) return false;
  return roundMatches.every((m) => m.winner_pair_id != null);
}
