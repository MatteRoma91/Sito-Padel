import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const testDb = path.join(process.cwd(), 'data', 'test-tournament-side-effects.db');

describe('tournament side effects', () => {
  beforeEach(() => {
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
    process.env.DATABASE_PATH = testDb;
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    if (fs.existsSync(testDb)) fs.unlinkSync(testDb);
  });

  it('reopen removes tournament from cumulative ATP sum', async () => {
    const q = await import('@/lib/db/queries');
    q.ensureDb();
    const adminId = q.createUser({ username: 'adm', password: 'x', role: 'admin', full_name: 'Admin' });
    const u1 = q.createUser({ username: 'p1', password: 'x', role: 'player', full_name: 'P1', nickname: 'P1' });
    const u2 = q.createUser({ username: 'p2', password: 'x', role: 'player', full_name: 'P2', nickname: 'P2' });
    const u3 = q.createUser({ username: 'p3', password: 'x', role: 'player', full_name: 'P3', nickname: 'P3' });
    const u4 = q.createUser({ username: 'p4', password: 'x', role: 'player', full_name: 'P4', nickname: 'P4' });

    const tid = q.createTournament({
      name: 'RR',
      date: '2026-07-01',
      max_players: 8,
      category: 'brocco_500',
      created_by: adminId,
    });

    q.updateTournament(tid, { status: 'completed', completed_at: new Date().toISOString() });
    q.insertPairs(tid, [
      { player1_id: u1, player2_id: u2, seed: 1 },
      { player1_id: u3, player2_id: u4, seed: 2 },
    ]);
    const pairs = q.getPairs(tid);
    const p1 = pairs.find((p) => p.seed === 1)!;
    q.insertTournamentRanking({ tournament_id: tid, pair_id: p1.id, position: 1, points: 500, is_override: 0 });
    q.recalculateCumulativeRankings();
    const ptsBefore = q.getCumulativeRankings().find((r) => r.user_id === u1)?.total_points ?? 0;
    expect(ptsBefore).toBeGreaterThan(0);

    q.reopenTournament(tid);
    const ptsAfter = q.getCumulativeRankings().find((r) => r.user_id === u1)?.total_points ?? 0;
    expect(ptsAfter).toBe(0);
  });
});
