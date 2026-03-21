import { describe, it, expect } from 'vitest';
import type { Pair } from '@/lib/types';
import { validatePairUpdates } from '@/lib/tournaments/pair-updates';

const basePairs: Pair[] = [
  { id: 'p1', tournament_id: 't1', player1_id: 'u1', player2_id: 'u2', seed: 1 },
  { id: 'p2', tournament_id: 't1', player1_id: 'u3', player2_id: 'u4', seed: 2 },
];

describe('validatePairUpdates', () => {
  it('allows atomic swap across two pairs', () => {
    const result = validatePairUpdates({
      existingPairs: basePairs,
      updates: [
        { pair_id: 'p1', player1_id: 'u1', player2_id: 'u4' },
        { pair_id: 'p2', player1_id: 'u3', player2_id: 'u2' },
      ],
      participatingUserIds: ['u1', 'u2', 'u3', 'u4'],
      decidedPairIds: new Set(),
      acknowledgePlayedMatches: false,
    });

    expect(result.ok).toBe(true);
    expect(result.normalizedUpdates).toHaveLength(2);
  });

  it('rejects duplicated player in final pair composition', () => {
    const result = validatePairUpdates({
      existingPairs: basePairs,
      updates: [{ pair_id: 'p1', player1_id: 'u1', player2_id: 'u3' }],
      participatingUserIds: ['u1', 'u2', 'u3', 'u4'],
      decidedPairIds: new Set(),
      acknowledgePlayedMatches: false,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('PLAYER_DUPLICATED');
  });

  it('requires ack when editing pair with decided matches', () => {
    const result = validatePairUpdates({
      existingPairs: basePairs,
      updates: [{ pair_id: 'p1', player1_id: 'u1', player2_id: 'u4' }],
      participatingUserIds: ['u1', 'u2', 'u3', 'u4'],
      decidedPairIds: new Set(['p1']),
      acknowledgePlayedMatches: false,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NEED_ACK_PLAYED_MATCHES');
  });
});
