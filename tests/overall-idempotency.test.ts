import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const testDb = path.join(process.cwd(), 'data', 'test-overall-idempotency.db');

describe('overall idempotency', () => {
  beforeEach(() => {
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
    process.env.DATABASE_PATH = testDb;
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
  });

  it('apply twice is no-op; revert restores baseline', async () => {
    const {
      ensureDb,
      createUser,
      createTournament,
      insertPairs,
      getPairs,
      insertMatches,
      insertTournamentRanking,
      applyTournamentResultToOverall,
      revertTournamentResultFromOverall,
      getUserById,
      isTournamentOverallApplied,
    } = await import('@/lib/db/queries');

    ensureDb();
    const adminId = createUser({ username: 'adm', password: 'x', role: 'admin', full_name: 'Admin' });
    const u1 = createUser({ username: 'p1', password: 'x', role: 'player', full_name: 'P1', nickname: 'P1' });
    const u2 = createUser({ username: 'p2', password: 'x', role: 'player', full_name: 'P2', nickname: 'P2' });
    const u3 = createUser({ username: 'p3', password: 'x', role: 'player', full_name: 'P3', nickname: 'P3' });
    const u4 = createUser({ username: 'p4', password: 'x', role: 'player', full_name: 'P4', nickname: 'P4' });

    const tid = createTournament({
      name: 'Test RR',
      date: '2026-06-01',
      max_players: 8,
      category: 'brocco_500',
      created_by: adminId,
    });

    insertPairs(tid, [
      { player1_id: u1, player2_id: u2, seed: 1 },
      { player1_id: u3, player2_id: u4, seed: 2 },
    ]);
    const pairs = getPairs(tid);
    const pair1 = pairs.find((p) => p.seed === 1)!;
    const pair2 = pairs.find((p) => p.seed === 2)!;

    insertMatches(tid, [
      {
        round: 'round_robin',
        bracket_type: 'main',
        pair1_id: pair1.id,
        pair2_id: pair2.id,
        score_pair1: 6,
        score_pair2: 3,
        winner_pair_id: pair1.id,
        order_in_round: 0,
      },
    ]);

    insertTournamentRanking({ tournament_id: tid, pair_id: pair1.id, position: 1, points: 500, is_override: 0 });
    insertTournamentRanking({ tournament_id: tid, pair_id: pair2.id, position: 4, points: 80, is_override: 0 });

    const baseline1 = getUserById(u1)!.overall_score ?? 50;

    applyTournamentResultToOverall(tid);
    const afterFirst = getUserById(u1)!.overall_score!;
    expect(isTournamentOverallApplied(tid)).toBe(true);
    expect(afterFirst).toBeGreaterThan(baseline1);

    applyTournamentResultToOverall(tid);
    expect(getUserById(u1)!.overall_score).toBe(afterFirst);

    revertTournamentResultFromOverall(tid);
    expect(getUserById(u1)!.overall_score).toBe(baseline1);
    expect(isTournamentOverallApplied(tid)).toBe(false);
  });
});
