import type { SkillLevel } from './types';
import { SKILL_LEVEL_VALUES } from './types';

export interface ExtractedPair {
  player1_id: string;
  player2_id: string;
  seed: number;
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

/**
 * Estrae le coppie con il metodo forte+debole
 * per tornei da 16 giocatori (8 coppie).
 */
export function extractPairs(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>
): ExtractedPair[] {
  if (playerIds.length !== 16) {
    throw new Error(`Servono esattamente 16 giocatori, trovati ${playerIds.length}`);
  }

  const sorted = sortPlayersForExtraction(playerIds, rankings, skillLevels, overallScores);

  const pairs: ExtractedPair[] = [];

  // Accoppia forte con debole
  for (let i = 0; i < 8; i++) {
    pairs.push({
      player1_id: sorted[i],         // Giocatore forte (posizioni 1-8)
      player2_id: sorted[15 - i],    // Giocatore debole (posizioni 16-9)
      seed: i + 1,
    });
  }

  return pairs;
}

/**
 * Estrae le coppie con il metodo forte+debole
 * per tornei da 8 giocatori (4 coppie).
 * Accoppia: 1° con 8°, 2° con 7°, 3° con 6°, 4° con 5°.
 */
export function extractPairsFor8Players(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>
): ExtractedPair[] {
  if (playerIds.length !== 8) {
    throw new Error(`Servono esattamente 8 giocatori, trovati ${playerIds.length}`);
  }

  const sorted = sortPlayersForExtraction(playerIds, rankings, skillLevels, overallScores);

  const pairs: ExtractedPair[] = [];

  for (let i = 0; i < 4; i++) {
    pairs.push({
      player1_id: sorted[i],
      player2_id: sorted[7 - i],
      seed: i + 1,
    });
  }

  return pairs;
}
