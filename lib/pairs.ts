import type { SkillLevel } from './types';
import { SKILL_LEVEL_VALUES } from './types';

export interface ExtractedPair {
  player1_id: string;
  player2_id: string;
  seed: number;
}

/** Vincolo rigido (torneo precedente) + preferenza soft (tornei 2–5). */
export interface PartnerConstraints {
  hardPrevious: Map<string, Set<string>>;
  softOlder: Map<string, Set<string>>;
}

export class PairingConstraintError extends Error {
  constructor() {
    super(
      'Impossibile formare coppie senza ripetere almeno una coppia del torneo immediatamente precedente. Modifica le coppie manualmente o cambia i partecipanti.'
    );
    this.name = 'PairingConstraintError';
  }
}

/**
 * Estrae le coppie con il metodo forte+debole
 * Ordina i 16 giocatori per:
 * 1. Overall score (0-100) se fornito, altrimenti skill level - criterio primario
 * 2. Punti cumulativi - tie-breaker
 * Poi accoppia: 1° con 16°, 2° con 15°, 3° con 14°, ... 8° con 9°
 */
function sortPlayersForExtraction(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>
): string[] {
  const sorted = [...playerIds].sort((a, b) => {
    if (overallScores) {
      const scoreA = overallScores.get(a) ?? 50;
      const scoreB = overallScores.get(b) ?? 50;
      if (scoreB !== scoreA) return scoreB - scoreA;
    } else {
      const skillA = skillLevels.get(a);
      const skillB = skillLevels.get(b);
      const skillValueA = skillA ? SKILL_LEVEL_VALUES[skillA] : 0;
      const skillValueB = skillB ? SKILL_LEVEL_VALUES[skillB] : 0;
      if (skillValueB !== skillValueA) return skillValueB - skillValueA;
    }
    const pointsA = rankings.get(a) || 0;
    const pointsB = rankings.get(b) || 0;
    return pointsB - pointsA;
  });

  return sorted;
}

function isHardBlocked(s: string, w: string, hard: Map<string, Set<string>>): boolean {
  return hard.get(s)?.has(w) ?? false;
}

function softViolation(s: string, w: string, soft: Map<string, Set<string>>): number {
  return soft.get(s)?.has(w) ? 1 : 0;
}

/**
 * Biiezione strong[i] ↔ weak[perm[i]] con vincoli rigidi su coppie vietate;
 * minimizza le violazioni soft (partner nei tornei 2–5 precedenti).
 */
export function assignStrongWeakWithPartnerConstraints(
  strong: string[],
  weak: string[],
  hardPrevious: Map<string, Set<string>>,
  softOlder: Map<string, Set<string>>
): Array<{ strong: string; weak: string }> {
  const n = strong.length;
  if (n !== weak.length) {
    throw new Error('strong e weak devono avere la stessa lunghezza');
  }
  if (n === 0) {
    return [];
  }

  let bestViolations = Infinity;
  let bestMatchWeakIndex: number[] | null = null;

  const usedWeak = new Array(n).fill(false);
  const weakIndexForStrong = new Array(n).fill(-1);

  function dfs(strongIdx: number, softTotal: number): void {
    if (softTotal >= bestViolations) {
      return;
    }
    if (strongIdx === n) {
      if (softTotal < bestViolations) {
        bestViolations = softTotal;
        bestMatchWeakIndex = weakIndexForStrong.slice();
      }
      return;
    }

    for (let j = 0; j < n; j++) {
      if (usedWeak[j]) continue;
      const w = weak[j];
      if (isHardBlocked(strong[strongIdx], w, hardPrevious)) continue;
      const add = softViolation(strong[strongIdx], w, softOlder);
      usedWeak[j] = true;
      weakIndexForStrong[strongIdx] = j;
      dfs(strongIdx + 1, softTotal + add);
      usedWeak[j] = false;
    }
  }

  dfs(0, 0);

  if (bestMatchWeakIndex === null) {
    throw new PairingConstraintError();
  }

  return strong.map((s, i) => ({ strong: s, weak: weak[bestMatchWeakIndex[i]] }));
}

/**
 * Estrae le coppie con il metodo forte+debole
 * per tornei da 16 giocatori (8 coppie).
 * Vincolo rigido: no stessa coppia del torneo immediatamente precedente.
 * Soft: preferenza di non ripetere partner dei tornei 2–5 precedenti.
 */
export function extractPairs(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>,
  constraints?: PartnerConstraints
): ExtractedPair[] {
  if (playerIds.length !== 16) {
    throw new Error(`Servono esattamente 16 giocatori, trovati ${playerIds.length}`);
  }

  const sorted = sortPlayersForExtraction(playerIds, rankings, skillLevels, overallScores);
  const strong = sorted.slice(0, 8);
  const weak = sorted.slice(8, 16);
  const hard = constraints?.hardPrevious ?? new Map<string, Set<string>>();
  const soft = constraints?.softOlder ?? new Map<string, Set<string>>();

  const assigned = assignStrongWeakWithPartnerConstraints(strong, weak, hard, soft);

  return assigned.map((p, i) => ({
    player1_id: p.strong,
    player2_id: p.weak,
    seed: i + 1,
  }));
}

/**
 * Estrae le coppie con il metodo forte+debole
 * per tornei da 8 giocatori (4 coppie).
 */
export function extractPairsFor8Players(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>,
  constraints?: PartnerConstraints
): ExtractedPair[] {
  if (playerIds.length !== 8) {
    throw new Error(`Servono esattamente 8 giocatori, trovati ${playerIds.length}`);
  }

  const sorted = sortPlayersForExtraction(playerIds, rankings, skillLevels, overallScores);
  const strong = sorted.slice(0, 4);
  const weak = sorted.slice(4, 8);
  const hard = constraints?.hardPrevious ?? new Map<string, Set<string>>();
  const soft = constraints?.softOlder ?? new Map<string, Set<string>>();

  const assigned = assignStrongWeakWithPartnerConstraints(strong, weak, hard, soft);

  return assigned.map((p, i) => ({
    player1_id: p.strong,
    player2_id: p.weak,
    seed: i + 1,
  }));
}

/**
 * Estrae 6 coppie da 12 giocatori (stesso criterio forte+debole del tabellone 16).
 */
export function extractPairsFor12Players(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>,
  constraints?: PartnerConstraints
): ExtractedPair[] {
  if (playerIds.length !== 12) {
    throw new Error(`Servono esattamente 12 giocatori, trovati ${playerIds.length}`);
  }

  const sorted = sortPlayersForExtraction(playerIds, rankings, skillLevels, overallScores);
  const strong = sorted.slice(0, 6);
  const weak = sorted.slice(6, 12);
  const hard = constraints?.hardPrevious ?? new Map<string, Set<string>>();
  const soft = constraints?.softOlder ?? new Map<string, Set<string>>();

  const assigned = assignStrongWeakWithPartnerConstraints(strong, weak, hard, soft);

  return assigned.map((p, i) => ({
    player1_id: p.strong,
    player2_id: p.weak,
    seed: i + 1,
  }));
}
