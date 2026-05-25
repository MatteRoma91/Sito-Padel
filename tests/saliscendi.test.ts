import { describe, it, expect } from 'vitest';
import {
  computeNextSaliscendiPairings,
  calculateSaliscendiRankings,
  isSaliscendiTournamentComplete,
} from '@/lib/tournaments/saliscendi';
import type { Match, Pair } from '@/lib/types';

function m(
  partial: Partial<Match> & Pick<Match, 'id' | 'pair1_id' | 'pair2_id' | 'winner_pair_id' | 'court_tier' | 'round_number'>
): Match {
  return {
    tournament_id: 't1',
    round: 'saliscendi',
    bracket_type: 'main',
    score_pair1: 6,
    score_pair2: 4,
    order_in_round: 0,
    is_final_round: 0,
    ...partial,
  } as Match;
}

describe('saliscendi helpers', () => {
  it('computeNextSaliscendiPairings moves winners/losers', () => {
    const oro = m({
      id: '1',
      court_tier: 'oro',
      round_number: 1,
      pair1_id: 'a',
      pair2_id: 'b',
      winner_pair_id: 'a',
    });
    const arg = m({
      id: '2',
      court_tier: 'argento',
      round_number: 1,
      pair1_id: 'c',
      pair2_id: 'd',
      winner_pair_id: 'c',
    });
    const bro = m({
      id: '3',
      court_tier: 'bronzo',
      round_number: 1,
      pair1_id: 'e',
      pair2_id: 'f',
      winner_pair_id: 'e',
    });
    const next = computeNextSaliscendiPairings([oro, arg, bro]);
    expect(next.find((x) => x.tier === 'oro')).toEqual({ tier: 'oro', pair1_id: 'a', pair2_id: 'c' });
    expect(next.find((x) => x.tier === 'argento')).toEqual({ tier: 'argento', pair1_id: 'b', pair2_id: 'e' });
    expect(next.find((x) => x.tier === 'bronzo')).toEqual({ tier: 'bronzo', pair1_id: 'd', pair2_id: 'f' });
  });

  it('calculateSaliscendiRankings from final round', () => {
    const pairs: Pair[] = [
      {
        id: 'a',
        tournament_id: 't1',
        player1_id: 'u1',
        player2_id: 'u2',
        seed: 1,
      } as Pair,
      { id: 'b', tournament_id: 't1', player1_id: 'u3', player2_id: 'u4', seed: 2 } as Pair,
      { id: 'c', tournament_id: 't1', player1_id: 'u5', player2_id: 'u6', seed: 3 } as Pair,
      { id: 'd', tournament_id: 't1', player1_id: 'u7', player2_id: 'u8', seed: 4 } as Pair,
      { id: 'e', tournament_id: 't1', player1_id: 'u9', player2_id: 'u10', seed: 5 } as Pair,
      { id: 'f', tournament_id: 't1', player1_id: 'u11', player2_id: 'u12', seed: 6 } as Pair,
    ];
    const matches: Match[] = [
      m({
        id: 'm1',
        round_number: 2,
        is_final_round: 1,
        court_tier: 'oro',
        pair1_id: 'a',
        pair2_id: 'b',
        winner_pair_id: 'a',
      }),
      m({
        id: 'm2',
        round_number: 2,
        is_final_round: 1,
        court_tier: 'argento',
        pair1_id: 'c',
        pair2_id: 'd',
        winner_pair_id: 'c',
      }),
      m({
        id: 'm3',
        round_number: 2,
        is_final_round: 1,
        court_tier: 'bronzo',
        pair1_id: 'e',
        pair2_id: 'f',
        winner_pair_id: 'e',
      }),
    ];
    const rankings = calculateSaliscendiRankings(pairs, matches, 'master_1000');
    expect(rankings).toHaveLength(6);
    expect(rankings.find((r) => r.position === 1)?.pair_id).toBe('a');
    expect(isSaliscendiTournamentComplete(matches)).toBe(true);
  });

  it('isSaliscendiTournamentComplete false without final round', () => {
    const matches: Match[] = [
      m({
        id: 'm1',
        round_number: 1,
        is_final_round: 0,
        court_tier: 'oro',
        pair1_id: 'a',
        pair2_id: 'b',
        winner_pair_id: 'a',
      }),
    ];
    expect(isSaliscendiTournamentComplete(matches)).toBe(false);
  });
});
