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
 * Assegna i partner ai giocatori forti evitando, quando possibile, quelli con cui
 * hanno già giocato negli ultimi N tornei. Mantiene il bilanciamento forte+debole.
 */
function assignPairsAvoidingRecent(
  strong: string[],
  weak: string[],
  recentPartners: Map<string, Set<string>>
): Array<{ strong: string; weak: string }> {
  const assigned = new Set<string>();
  const result: Array<{ strong: string; weak: string }> = [];

  for (const s of strong) {
    const recent = recentPartners.get(s);
    // Ordina weak per forza (più debole prima) - gli indici più alti in weak = più deboli
    const candidates = weak
      .filter((w) => !assigned.has(w))
      .sort((a, b) => {
        // Ordina per indice DESC: più debole prima (weak[7] = più debole per 16 giocatori)
        const idxA = weak.indexOf(a);
        const idxB = weak.indexOf(b);
        return idxB - idxA;
      });

    // Preferisci il più debole che NON è un partner recente
    const nonRecent = candidates.filter((w) => !recent?.has(w));
    const pick = (nonRecent.length > 0 ? nonRecent : candidates)[0];
    if (!pick) throw new Error('Nessun partner disponibile');
    assigned.add(pick);
    result.push({ strong: s, weak: pick });
  }
  return result;
}

/**
 * Estrae le coppie con il metodo forte+debole
 * per tornei da 16 giocatori (8 coppie).
 * Se recentPartners è fornito, evita di accoppiare chi ha già giocato insieme negli ultimi 5 tornei.
 */
export function extractPairs(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>,
  recentPartners?: Map<string, Set<string>>
): ExtractedPair[] {
  if (playerIds.length !== 16) {
    throw new Error(`Servono esattamente 16 giocatori, trovati ${playerIds.length}`);
  }

  const sorted = sortPlayersForExtraction(playerIds, rankings, skillLevels, overallScores);
  const strong = sorted.slice(0, 8);
  const weak = sorted.slice(8, 16);
  const partners = recentPartners ?? new Map<string, Set<string>>();

  const assigned = assignPairsAvoidingRecent(strong, weak, partners);

  return assigned.map((p, i) => ({
    player1_id: p.strong,
    player2_id: p.weak,
    seed: i + 1,
  }));
}

/**
 * Estrae le coppie con il metodo forte+debole
 * per tornei da 8 giocatori (4 coppie).
 * Se recentPartners è fornito, evita di accoppiare chi ha già giocato insieme negli ultimi 5 tornei.
 */
export function extractPairsFor8Players(
  playerIds: string[],
  rankings: Map<string, number>,
  skillLevels: Map<string, SkillLevel | null>,
  overallScores?: Map<string, number>,
  recentPartners?: Map<string, Set<string>>
): ExtractedPair[] {
  if (playerIds.length !== 8) {
    throw new Error(`Servono esattamente 8 giocatori, trovati ${playerIds.length}`);
  }

  const sorted = sortPlayersForExtraction(playerIds, rankings, skillLevels, overallScores);
  const strong = sorted.slice(0, 4);
  const weak = sorted.slice(4, 8);
  const partners = recentPartners ?? new Map<string, Set<string>>();

  const assigned = assignPairsAvoidingRecent(strong, weak, partners);

  return assigned.map((p, i) => ({
    player1_id: p.strong,
    player2_id: p.weak,
    seed: i + 1,
  }));
}
