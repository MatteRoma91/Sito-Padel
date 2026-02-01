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
 * 1. Skill level (A_GOLD=5 ... C=1, null=0) - criterio primario
 * 2. Punti cumulativi - tie-breaker
 * Poi accoppia: 1° con 16°, 2° con 15°, 3° con 14°, ... 8° con 9°
 */
export function extractPairs(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>
): ExtractedPair[] {
  if (playerIds.length !== 16) {
    throw new Error(`Servono esattamente 16 giocatori, trovati ${playerIds.length}`);
  }

  // Ordina per skill level (primario) e punti (secondario) - entrambi decrescenti
  const sorted = [...playerIds].sort((a, b) => {
    const skillA = skillLevels.get(a);
    const skillB = skillLevels.get(b);
    const skillValueA = skillA ? SKILL_LEVEL_VALUES[skillA] : 0;
    const skillValueB = skillB ? SKILL_LEVEL_VALUES[skillB] : 0;
    
    // Prima ordina per skill level
    if (skillValueB !== skillValueA) {
      return skillValueB - skillValueA;
    }
    
    // Poi per punti come tie-breaker
    const pointsA = rankings.get(a) || 0;
    const pointsB = rankings.get(b) || 0;
    return pointsB - pointsA;
  });

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
