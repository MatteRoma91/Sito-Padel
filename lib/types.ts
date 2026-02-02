// Tipi condivisi

export type UserRole = 'admin' | 'player';

export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'completed';

export type TournamentCategory = 'grand_slam' | 'master_1000';

export type SkillLevel = 'A_GOLD' | 'A_SILVER' | 'B_GOLD' | 'B_SILVER' | 'C';

/** Livello derivato dal punteggio overall 0-100 (include D e Santiago) */
export type OverallLevel = 'A_GOLD' | 'A_SILVER' | 'B_GOLD' | 'B_SILVER' | 'C' | 'D' | 'SANTIAGO';

export const OVERALL_LEVEL_LABELS: Record<OverallLevel, string> = {
  A_GOLD: 'A Gold',
  A_SILVER: 'A Silver',
  B_GOLD: 'B Gold',
  B_SILVER: 'B Silver',
  C: 'C',
  D: 'D',
  SANTIAGO: 'Santiago',
};

/** Deriva il livello dal punteggio overall (0-100). */
export function overallScoreToLevel(score: number | null | undefined): OverallLevel {
  const s = score ?? 50;
  if (s >= 90) return 'A_GOLD';
  if (s >= 80) return 'A_SILVER';
  if (s >= 70) return 'B_GOLD';
  if (s >= 60) return 'B_SILVER';
  if (s >= 50) return 'C';
  if (s >= 40) return 'D';
  return 'SANTIAGO';
}

/** Mappa OverallLevel su SkillLevel per pairs (D e Santiago -> C). */
export function overallLevelToSkillLevel(level: OverallLevel): SkillLevel | null {
  if (level === 'D' || level === 'SANTIAGO') return 'C';
  return level;
}

/** Delta per aggiornamento overall a fine torneo */
export const MATCH_WIN_DELTA = 1;
export const MATCH_LOSS_DELTA = -1;
export const TOURNAMENT_WIN_DELTA = 2;
export const TOURNAMENT_LAST_DELTA = -2;

export const SKILL_LEVEL_VALUES: Record<SkillLevel, number> = {
  'A_GOLD': 5,
  'A_SILVER': 4,
  'B_GOLD': 3,
  'B_SILVER': 2,
  'C': 1,
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  'A_GOLD': 'A Gold',
  'A_SILVER': 'A Silver',
  'B_GOLD': 'B Gold',
  'B_SILVER': 'B Silver',
  'C': 'C',
};

export type FieldSide = 'Destra' | 'Sinistra';
export type Hand = 'Destra' | 'Sinistra';

export type MatchRound = 
  | 'quarterfinal'
  | 'semifinal'
  | 'final'
  | 'third_place'
  | 'consolation_semi'
  | 'consolation_final'
  | 'consolation_seventh';

export type BracketType = 'main' | 'consolation';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  full_name: string | null;
  nickname: string | null;
  role: UserRole;
  avatar: string | null;
  must_change_password: number;
  skill_level: SkillLevel | null;
  overall_score: number | null;
  bio: string | null;
  preferred_side: FieldSide | null;
  preferred_hand: Hand | null;
  birth_date: string | null;
  is_hidden: number;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  status: TournamentStatus;
  category: TournamentCategory;
  created_by: string;
  created_at: string;
}

export interface TournamentParticipant {
  tournament_id: string;
  user_id: string;
  confirmed: number;
  participating: number;
}

export interface Pair {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  seed: number;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: MatchRound;
  bracket_type: BracketType;
  pair1_id: string | null;
  pair2_id: string | null;
  score_pair1: number | null;
  score_pair2: number | null;
  winner_pair_id: string | null;
  order_in_round: number;
}

export interface TournamentRanking {
  tournament_id: string;
  pair_id: string;
  position: number;
  points: number;
  is_override: number;
}

export interface CumulativeRanking {
  user_id: string;
  total_points: number;
  is_override: number;
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
  wooden_spoons: number;
}

// Punti per posizione (legacy, usare getPositionPoints per categoria)
export const POSITION_POINTS: Record<number, number> = {
  1: 100, 2: 80, 3: 60, 4: 40, 5: 30, 6: 20, 7: 10, 8: 5,
};

// Punti per categoria torneo
export const POSITION_POINTS_GRAND_SLAM: Record<number, number> = {
  1: 2000, 2: 1300, 3: 800, 4: 400, 5: 200, 6: 100, 7: 50, 8: 10,
};
export const POSITION_POINTS_MASTER_1000: Record<number, number> = {
  1: 1000, 2: 650, 3: 400, 4: 200, 5: 100, 6: 50, 7: 25, 8: 10,
};

export const POSITION_POINTS_BY_CATEGORY: Record<TournamentCategory, Record<number, number>> = {
  grand_slam: POSITION_POINTS_GRAND_SLAM,
  master_1000: POSITION_POINTS_MASTER_1000,
};

export function getPositionPoints(category: TournamentCategory, position: number): number {
  const points = POSITION_POINTS_BY_CATEGORY[category];
  return (points && points[position]) ?? 0;
}

export const TOURNAMENT_CATEGORY_LABELS: Record<TournamentCategory, string> = {
  grand_slam: 'Grande Slam',
  master_1000: 'Master 1000',
};

// Sistema medaglie
export type MedalType = 'gold' | 'silver' | 'bronze' | 'wooden_spoon';

export const MEDAL_LABELS: Record<MedalType, string> = {
  gold: 'Oro',
  silver: 'Argento',
  bronze: 'Bronzo',
  wooden_spoon: 'Cucchiarella',
};

export const MEDAL_ICONS: Record<MedalType, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  wooden_spoon: '🥄',
};
