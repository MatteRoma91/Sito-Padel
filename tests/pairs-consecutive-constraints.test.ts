import { describe, it, expect } from 'vitest';
import {
  assignStrongWeakWithPartnerConstraints,
  PairingConstraintError,
  extractPairsFor8Players,
} from '@/lib/pairs';
import type { SkillLevel } from '@/lib/types';

function mapFromPairs(pairs: [string, string][]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const [a, b] of pairs) {
    if (!m.has(a)) m.set(a, new Set());
    if (!m.has(b)) m.set(b, new Set());
    m.get(a)!.add(b);
    m.get(b)!.add(a);
  }
  return m;
}

describe('assignStrongWeakWithPartnerConstraints', () => {
  it('senza vincoli accoppia 1°+ultimo, 2°+penultimo (coppie equilibrate)', () => {
    const strong = ['a', 'b', 'c', 'd'];
    const weak = ['w0', 'w1', 'w2', 'w3'];
    const out = assignStrongWeakWithPartnerConstraints(strong, weak, new Map(), new Map());
    expect(out).toEqual([
      { strong: 'a', weak: 'w3' },
      { strong: 'b', weak: 'w2' },
      { strong: 'c', weak: 'w1' },
      { strong: 'd', weak: 'w0' },
    ]);
  });

  it('evita il vincolo rigido quando esiste un alternativa', () => {
    const strong = ['a', 'b', 'c', 'd'];
    const weak = ['w0', 'w1', 'w2', 'w3'];
    const hard = mapFromPairs([['a', 'w0']]);
    const out = assignStrongWeakWithPartnerConstraints(strong, weak, hard, new Map());
    const aPair = out.find((p) => p.strong === 'a');
    expect(aPair?.weak).not.toBe('w0');
  });

  it('lancia PairingConstraintError se il vincolo rigido rende impossibile il matching', () => {
    const strong = ['a', 'b'];
    const weak = ['x', 'y'];
    const hard = mapFromPairs([
      ['a', 'x'],
      ['a', 'y'],
    ]);
    expect(() => assignStrongWeakWithPartnerConstraints(strong, weak, hard, new Map())).toThrow(
      PairingConstraintError
    );
  });

  it('minimizza le violazioni soft tra i matching validi', () => {
    const strong = ['s0', 's1'];
    const weak = ['w0', 'w1'];
    const hard = new Map<string, Set<string>>();
    const soft = mapFromPairs([['s0', 'w0']]);
    const out = assignStrongWeakWithPartnerConstraints(strong, weak, hard, soft);
    const s0 = out.find((p) => p.strong === 's0');
    expect(s0?.weak).toBe('w1');
  });
});

describe('extractPairsFor8Players con constraints', () => {
  const ids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
  const rankings = new Map(ids.map((id) => [id, 0]));
  const skills = new Map<string, SkillLevel | null>(ids.map((id) => [id, null]));
  const overall = new Map(
    ids.map((id, i) => [id, 100 - i]) // p0 più forte ... p7 più debole
  );

  it('senza vincoli: 1° overall con l\'ultimo, non 1° con il 5°', () => {
    const pairs = extractPairsFor8Players(ids, rankings, skills, overall);
    expect(pairs).toEqual([
      { player1_id: 'p0', player2_id: 'p7', seed: 1 },
      { player1_id: 'p1', player2_id: 'p6', seed: 2 },
      { player1_id: 'p2', player2_id: 'p5', seed: 3 },
      { player1_id: 'p3', player2_id: 'p4', seed: 4 },
    ]);
  });

  it('ordina per overall prima dei punti ATP', () => {
    const atp = new Map([
      ['p0', 10],
      ['p1', 999],
      ['p2', 10],
      ['p3', 10],
      ['p4', 10],
      ['p5', 10],
      ['p6', 10],
      ['p7', 10],
    ]);
    const pairs = extractPairsFor8Players(ids, atp, skills, overall);
    expect(pairs[0]).toMatchObject({ player1_id: 'p0', player2_id: 'p7' });
    expect(pairs.find((x) => x.player1_id === 'p1')?.player2_id).toBe('p6');
  });

  it('integrazione: vincolo rigido sulla coppia naturale 1°+ultimo, sceglie la più vicina', () => {
    const hard = mapFromPairs([['p0', 'p7']]);
    const pairs = extractPairsFor8Players(ids, rankings, skills, overall, {
      hardPrevious: hard,
      softOlder: new Map(),
    });
    const p0 = pairs.find((x) => x.player1_id === 'p0');
    expect(p0?.player2_id).not.toBe('p7');
    expect(p0?.player2_id).toBe('p6');
  });
});
