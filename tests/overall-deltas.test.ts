import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const testDb = path.join(process.cwd(), 'data', 'test-overall-deltas.db');

describe('getOverallPositionDelta', () => {
  it('tabellone 16: posizioni con bonus/malus attesi', async () => {
    const { getOverallPositionDelta } = await import('@/lib/types');
    expect(getOverallPositionDelta(1, 'bracket_16')).toBe(3);
    expect(getOverallPositionDelta(2, 'bracket_16')).toBe(2);
    expect(getOverallPositionDelta(3, 'bracket_16')).toBe(1);
    expect(getOverallPositionDelta(4, 'bracket_16')).toBe(0);
    expect(getOverallPositionDelta(5, 'bracket_16')).toBe(0);
    expect(getOverallPositionDelta(6, 'bracket_16')).toBe(0);
    expect(getOverallPositionDelta(7, 'bracket_16')).toBe(-1);  // penultimo
    expect(getOverallPositionDelta(8, 'bracket_16')).toBe(-2);  // ultimo
  });

  it('saliscendi 12: posizioni con bonus/malus attesi', async () => {
    const { getOverallPositionDelta } = await import('@/lib/types');
    expect(getOverallPositionDelta(1, 'saliscendi_12')).toBe(3);
    expect(getOverallPositionDelta(2, 'saliscendi_12')).toBe(2);
    expect(getOverallPositionDelta(3, 'saliscendi_12')).toBe(1);
    expect(getOverallPositionDelta(4, 'saliscendi_12')).toBe(0);
    expect(getOverallPositionDelta(5, 'saliscendi_12')).toBe(-1);  // penultimo
    expect(getOverallPositionDelta(6, 'saliscendi_12')).toBe(-2);  // ultimo
  });

  it('brocco a 8: tabella esplicita 1/2/3/4', async () => {
    const { getOverallPositionDelta } = await import('@/lib/types');
    expect(getOverallPositionDelta(1, 'round_robin_8')).toBe(2);
    expect(getOverallPositionDelta(2, 'round_robin_8')).toBe(1);
    expect(getOverallPositionDelta(3, 'round_robin_8')).toBe(0);
    expect(getOverallPositionDelta(4, 'round_robin_8')).toBe(-1);
  });

  it('MATCH_WIN_DELTA = 2 e MATCH_LOSS_DELTA = -1', async () => {
    const { MATCH_WIN_DELTA, MATCH_LOSS_DELTA } = await import('@/lib/types');
    expect(MATCH_WIN_DELTA).toBe(2);
    expect(MATCH_LOSS_DELTA).toBe(-1);
  });
});

describe('overall: computeTournamentOverallDeltas', () => {
  beforeEach(() => {
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
    process.env.DATABASE_PATH = testDb;
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
  });

  it('bracket_16: 1° con 2 vittorie e 1 sconfitta → delta = 2*2 + 1*(-1) + 3 = 6', async () => {
    const {
      ensureDb,
      createUser,
      createTournament,
      insertPairs,
      getPairs,
      insertMatches,
      insertTournamentRanking,
      computeTournamentOverallDeltas,
    } = await import('@/lib/db/queries');

    ensureDb();
    const adminId = createUser({ username: 'adm', password: 'x', role: 'admin', full_name: 'Admin' });
    const u1 = createUser({ username: 'p1', password: 'x', role: 'player', full_name: 'P1', nickname: 'P1' });
    const u2 = createUser({ username: 'p2', password: 'x', role: 'player', full_name: 'P2', nickname: 'P2' });
    const u3 = createUser({ username: 'p3', password: 'x', role: 'player', full_name: 'P3', nickname: 'P3' });
    const u4 = createUser({ username: 'p4', password: 'x', role: 'player', full_name: 'P4', nickname: 'P4' });

    const tid = createTournament({
      name: 'Test 16',
      date: '2026-06-01',
      max_players: 16,
      category: 'master_1000',
      created_by: adminId,
    });

    insertPairs(tid, [
      { player1_id: u1, player2_id: u2, seed: 1 },
      { player1_id: u3, player2_id: u4, seed: 2 },
    ]);
    const pairs = getPairs(tid);
    const pair1 = pairs.find((p) => p.seed === 1)!;
    const pair2 = pairs.find((p) => p.seed === 2)!;

    // pair1 wins 2, loses 1 → position 1
    insertMatches(tid, [
      { round: 'semifinal', bracket_type: 'main', pair1_id: pair1.id, pair2_id: pair2.id, score_pair1: 6, score_pair2: 3, winner_pair_id: pair1.id, order_in_round: 0 },
      { round: 'final', bracket_type: 'main', pair1_id: pair1.id, pair2_id: pair2.id, score_pair1: 6, score_pair2: 3, winner_pair_id: pair1.id, order_in_round: 0 },
      { round: 'quarterfinal', bracket_type: 'main', pair1_id: pair2.id, pair2_id: pair1.id, score_pair1: 7, score_pair2: 6, winner_pair_id: pair2.id, order_in_round: 1 },
    ]);

    insertTournamentRanking({ tournament_id: tid, pair_id: pair1.id, position: 1, points: 1000, is_override: 0 });
    insertTournamentRanking({ tournament_id: tid, pair_id: pair2.id, position: 8, points: 0, is_override: 0 });

    const deltas = computeTournamentOverallDeltas(tid);
    // u1 (pair1): 2 wins * 2 + 1 loss * (-1) + position 1 bonus (+3) = 4 - 1 + 3 = 6
    expect(deltas.get(u1)).toBe(6);
    // u3/u4 (pair2): 1 win * 2 + 2 losses * (-1) + position 8 malus (-2) = 2 - 2 - 2 = -2
    expect(deltas.get(u3)).toBe(-2);
  });

  it('round_robin_8: 1° con 1 vittoria → delta = 1*2 + 0*(-1) + 2 = 4', async () => {
    const {
      ensureDb,
      createUser,
      createTournament,
      insertPairs,
      getPairs,
      insertMatches,
      insertTournamentRanking,
      computeTournamentOverallDeltas,
    } = await import('@/lib/db/queries');

    ensureDb();
    const adminId = createUser({ username: 'adm2', password: 'x', role: 'admin', full_name: 'Admin2' });
    const u1 = createUser({ username: 'q1', password: 'x', role: 'player', full_name: 'Q1', nickname: 'Q1' });
    const u2 = createUser({ username: 'q2', password: 'x', role: 'player', full_name: 'Q2', nickname: 'Q2' });
    const u3 = createUser({ username: 'q3', password: 'x', role: 'player', full_name: 'Q3', nickname: 'Q3' });
    const u4 = createUser({ username: 'q4', password: 'x', role: 'player', full_name: 'Q4', nickname: 'Q4' });

    const tid = createTournament({
      name: 'Test 8',
      date: '2026-06-02',
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
      { round: 'round_robin', bracket_type: 'main', pair1_id: pair1.id, pair2_id: pair2.id, score_pair1: 6, score_pair2: 3, winner_pair_id: pair1.id, order_in_round: 0 },
    ]);
    insertTournamentRanking({ tournament_id: tid, pair_id: pair1.id, position: 1, points: 500, is_override: 0 });
    insertTournamentRanking({ tournament_id: tid, pair_id: pair2.id, position: 4, points: 80, is_override: 0 });

    const deltas = computeTournamentOverallDeltas(tid);
    // u1 (pair1): 1 win * 2 + position 1 → +2 = 4
    expect(deltas.get(u1)).toBe(4);
    // u3 (pair2): 1 loss * (-1) + position 4 → -1 = -2
    expect(deltas.get(u3)).toBe(-2);
  });
});

describe('overall: getOverallScoreHistory ignores in_progress tournaments', () => {
  beforeEach(() => {
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
    process.env.DATABASE_PATH = testDb;
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
  });

  it('in_progress tournament not included in history; completed aligns with DB overall', async () => {
    const {
      ensureDb,
      createUser,
      createTournament,
      insertPairs,
      getPairs,
      insertMatches,
      insertTournamentRanking,
      applyTournamentResultToOverall,
      getUserById,
      getOverallScoreHistory,
      updateTournament,
    } = await import('@/lib/db/queries');

    ensureDb();
    const adminId = createUser({ username: 'adm3', password: 'x', role: 'admin', full_name: 'Admin3' });
    const u1 = createUser({ username: 'r1', password: 'x', role: 'player', full_name: 'R1', nickname: 'R1' });
    const u2 = createUser({ username: 'r2', password: 'x', role: 'player', full_name: 'R2', nickname: 'R2' });

    const tidCompleted = createTournament({ name: 'Done', date: '2025-06-01', max_players: 8, category: 'brocco_500', created_by: adminId });
    const tidInProgress = createTournament({ name: 'WIP', date: '2025-08-01', max_players: 8, category: 'brocco_500', created_by: adminId });

    for (const tid of [tidCompleted, tidInProgress]) {
      insertPairs(tid, [{ player1_id: u1, player2_id: u2, seed: 1 }]);
      const pairs = getPairs(tid);
      const p = pairs[0];
      insertMatches(tid, [{ round: 'round_robin', bracket_type: 'main', pair1_id: p.id, pair2_id: p.id, score_pair1: 6, score_pair2: 3, winner_pair_id: p.id, order_in_round: 0 }]);
      insertTournamentRanking({ tournament_id: tid, pair_id: p.id, position: 1, points: 500, is_override: 0 });
    }

    // Mark completed tournament as completed
    updateTournament(tidCompleted, { status: 'completed', completed_at: new Date().toISOString() });
    applyTournamentResultToOverall(tidCompleted);

    const dbScore = getUserById(u1)!.overall_score!;
    const history = getOverallScoreHistory(u1);

    // History's last entry should match DB score
    const lastEntry = history[history.length - 1];
    expect(lastEntry.overall_score).toBe(dbScore);

    // Only 2 entries: baseline (2025-01-01) + completed tournament; in_progress excluded
    expect(history.length).toBe(2);
  });
});
