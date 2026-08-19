// Tipi condivisi

export type UserRole = 'admin' | 'player' | 'guest' | 'maestro';

export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'completed';

export type TournamentCategory = 'grand_slam' | 'master_1000' | 'brocco_500';

/** Formato struttura torneo (esplicito; retrocompatibile con NULL = inferito da max_players). */
export type TournamentFormat = 'bracket_16' | 'round_robin_8' | 'saliscendi_12';

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  bracket_16: 'Tabellone (16 giocatori)',
  round_robin_8: 'Girone Brocco (8 giocatori)',
  saliscendi_12: 'Saliscendi (12 giocatori, 6 coppie)',
};

/** Tier campo Saliscendi: Oro / Argento / Bronzo. */
export type SaliscendiCourtTier = 'oro' | 'argento' | 'bronzo';

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

/** Delta per aggiornamento overall a fine torneo (tutti i formati) */
export const MATCH_WIN_DELTA = 2;
export const MATCH_LOSS_DELTA = -1;

/** @deprecated usato solo per compatibilità retroattiva – ora getOverallPositionDelta */
export const TOURNAMENT_WIN_DELTA = 2;
export const TOURNAMENT_LAST_DELTA = -2;
export const TOURNAMENT_WIN_DELTA_8 = 2;
export const TOURNAMENT_LAST_DELTA_8 = -1;
export const TOURNAMENT_LAST_POSITION_8 = 4;

/** Saliscendi: 6 coppie, ultimo posto = 6°. */
export const TOURNAMENT_LAST_POSITION_12 = 6;

/**
 * Delta di classifica (bonus/malus posizione) per un giocatore.
 *
 * Tabellone 16 e Saliscendi 12:
 *   1° +3 | 2° +2 | 3° +1 | penultimo -1 | ultimo -2
 *
 * Brocco a 8 (4 coppie):
 *   1° +2 | 2° +1 | 3° 0 | 4° -1
 */
export function getOverallPositionDelta(
  position: number,
  format: TournamentFormat | null | undefined
): number {
  if (format === 'round_robin_8') {
    // Tabella esplicita 4 coppie
    if (position === 1) return 2;
    if (position === 2) return 1;
    if (position === 3) return 0;
    if (position === 4) return -1;
    return 0;
  }
  // bracket_16 e saliscendi_12 (e fallback)
  const lastPos = format === 'saliscendi_12' ? TOURNAMENT_LAST_POSITION_12 : 8;
  if (position === 1) return 3;
  if (position === 2) return 2;
  if (position === 3) return 1;
  if (position === lastPos - 1) return -1;  // penultimo
  if (position === lastPos) return -2;       // ultimo
  return 0;
}

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
  | 'consolation_seventh'
  | 'round_robin'
  | 'saliscendi';

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

export type SafeUser = Omit<User, 'password_hash' | 'must_change_password' | 'created_at'>;

export interface Tournament {
  id: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  status: TournamentStatus;
  category: TournamentCategory;
  max_players: number;
  /** NULL = inferito da max_players (8 girone, 16 tabellone). */
  format?: TournamentFormat | null;
  created_by: string;
  created_at: string;
  completed_at?: string | null;
  mvp_deadline?: string | null;
  /** ISO timestamp: overall già applicato per questo torneo (idempotenza consolidate). */
  overall_applied_at?: string | null;
}

/** Formato effettivo del torneo (retrocompatibile). */
export function getTournamentFormat(t: Pick<Tournament, 'format' | 'max_players'>): TournamentFormat {
  if (t.format === 'saliscendi_12' || t.max_players === 12) return 'saliscendi_12';
  if (t.max_players === 8) return 'round_robin_8';
  return 'bracket_16';
}

export function isSaliscendiTournament(t: Pick<Tournament, 'format' | 'max_players'>): boolean {
  return getTournamentFormat(t) === 'saliscendi_12';
}

/** Partecipanti / coppie attesi per formato. */
export function getExpectedPlayersAndPairs(t: Pick<Tournament, 'format' | 'max_players'>): { players: number; pairs: number } {
  const f = getTournamentFormat(t);
  if (f === 'saliscendi_12') return { players: 12, pairs: 6 };
  if (f === 'round_robin_8') return { players: 8, pairs: 4 };
  return { players: 16, pairs: 8 };
}

/** Ultima posizione in classifica torneo (per cucchiarella / overall). */
export function getLastRankingPosition(t: Pick<Tournament, 'format' | 'max_players'>): number {
  const f = getTournamentFormat(t);
  if (f === 'saliscendi_12') return TOURNAMENT_LAST_POSITION_12;
  if (f === 'round_robin_8') return TOURNAMENT_LAST_POSITION_8;
  return 8;
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
  /** Saliscendi: 1, 2, 3… Altri formati: 0. */
  round_number?: number;
  /** Saliscendi: campo logico. */
  court_tier?: SaliscendiCourtTier | null;
  /** Saliscendi: 1 se questo round è marcato come ultimo (classifica da qui). */
  is_final_round?: number;
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
  mvp_count: number;
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
// BroccoChallenger 500: torneo a 4 coppie (girone), solo 4 posizioni finali
export const POSITION_POINTS_BROCCO_500: Record<number, number> = {
  1: 500, 2: 250, 3: 175, 4: 80,
};

export const POSITION_POINTS_BY_CATEGORY: Record<TournamentCategory, Record<number, number>> = {
  grand_slam: POSITION_POINTS_GRAND_SLAM,
  master_1000: POSITION_POINTS_MASTER_1000,
  brocco_500: POSITION_POINTS_BROCCO_500,
};

export function getPositionPoints(category: TournamentCategory, position: number): number {
  const points = POSITION_POINTS_BY_CATEGORY[category];
  return (points && points[position]) ?? 0;
}

export const TOURNAMENT_CATEGORY_LABELS: Record<TournamentCategory, string> = {
  grand_slam: 'Grande Slam',
  master_1000: 'Master 1000',
  brocco_500: 'BroccoChallenger 500',
};

// Sistema medaglie e badge
export type MedalType = 'gold' | 'silver' | 'bronze' | 'wooden_spoon' | 'mvp';

export const MEDAL_LABELS: Record<MedalType, string> = {
  gold: 'Oro',
  silver: 'Argento',
  bronze: 'Bronzo',
  wooden_spoon: 'Cucchiarella',
  mvp: 'MVP',
};

export const MEDAL_ICONS: Record<MedalType, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  wooden_spoon: '🥄',
  mvp: '⭐',
};

// Centro sportivo: campi e prenotazioni
export type CourtType = 'indoor' | 'outdoor';

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  display_order: number;
}

export type BookingKind = 'standard' | 'lesson';

export interface CourtBooking {
  id: string;
  court_id: string;
  date: string;
  slot_start: string;
  slot_end: string;
  booking_name: string;
  tournament_id: string | null;
  booked_by_user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  status: BookingStatus;
  created_at: string;
  created_by: string | null;
  booking_kind?: BookingKind | string;
}

export type LessonEntitlementKind = 'private' | 'pair';

export interface LessonEntitlement {
  id: string;
  kind: LessonEntitlementKind;
  lessons_total: number;
  lessons_used: number;
  primary_user_id: string;
  partner_user_id: string | null;
  assigned_by_user_id: string;
  created_at: string;
}

export interface LessonConsumption {
  id: string;
  entitlement_id: string;
  consumed_at: string;
  maestro_user_id: string | null;
  notes: string | null;
  court_booking_id: string | null;
  manual_reason: string | null;
  created_at: string;
}

export type LessonRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LessonRequest {
  id: string;
  entitlement_id: string;
  requester_user_id: string;
  preferred_start: string;
  status: LessonRequestStatus;
  court_booking_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface CourtBookingParticipant {
  id: string;
  booking_id: string;
  user_id: string | null;
  position: number;
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_phone?: string | null;
}

export interface CenterClosedSlot {
  id: string;
  day_of_week: number;
  slot_start: string;
  slot_end: string;
}

export interface CourtBookingMatch {
  id: string;
  booking_id: string;
  created_at: string;
  result_winner: number | null;
  result_set1_c1: number | null;
  result_set1_c2: number | null;
  result_set2_c1: number | null;
  result_set2_c2: number | null;
  result_set3_c1: number | null;
  result_set3_c2: number | null;
  result_entered_at: string | null;
}
