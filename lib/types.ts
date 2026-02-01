// Tipi condivisi

export type UserRole = 'admin' | 'player';

export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'completed';

export type SkillLevel = 'A_GOLD' | 'A_SILVER' | 'B_GOLD' | 'B_SILVER' | 'C';

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
  bio: string | null;
  preferred_side: FieldSide | null;
  preferred_hand: Hand | null;
  birth_date: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  status: TournamentStatus;
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

// Punti per posizione
export const POSITION_POINTS: Record<number, number> = {
  1: 100,  // Oro
  2: 80,   // Argento
  3: 60,   // Bronzo
  4: 40,
  5: 30,
  6: 20,
  7: 10,
  8: 5,    // Cucchiarella
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
