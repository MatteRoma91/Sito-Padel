import { z } from 'zod';

// Common field constraints
export const loginSchema = z.object({
  username: z.string().min(1, 'Username richiesto').max(100),
  password: z.string().min(1, 'Password richiesta'),
});

export const changePasswordSchema = z.object({
  password: z.string().min(6, 'La password deve essere di almeno 6 caratteri').max(128),
});

export const createUserSchema = z.object({
  username: z.string().min(1, 'Username richiesto').max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'Username può contenere solo lettere, numeri, ., _, -'),
  full_name: z.string().max(200).optional(),
  nickname: z.string().max(100).optional(),
  role: z.enum(['admin', 'player']).optional().default('player'),
});

export const updateUserSchema = z.object({
  full_name: z.string().max(200).nullable().optional(),
  nickname: z.string().max(100).nullable().optional(),
  role: z.enum(['admin', 'player']).optional(),
  skill_level: z.enum(['A_GOLD', 'A_SILVER', 'B_GOLD', 'B_SILVER', 'C']).nullable().optional(),
  overall_score: z.number().min(0).max(100).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  preferred_side: z.enum(['Destra', 'Sinistra']).nullable().optional(),
  preferred_hand: z.enum(['Destra', 'Sinistra']).nullable().optional(),
  birth_date: z.string().max(20).nullable().optional(),
  is_hidden: z.boolean().optional(),
  new_password: z.string().min(6).max(128).optional(),
}).strict();

export const createTournamentSchema = z.object({
  name: z.string().min(1, 'Nome richiesto').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data nel formato YYYY-MM-DD'),
  time: z.string().max(20).optional(),
  venue: z.string().max(200).optional(),
  category: z.enum(['grand_slam', 'master_1000']).optional(),
  maxPlayers: z.coerce.number().int().refine((n) => n === 8 || n === 16, '8 o 16 giocatori').optional(),
});

export const updateTournamentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().max(20).nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  status: z.enum(['draft', 'open', 'in_progress', 'completed']).optional(),
  category: z.enum(['grand_slam', 'master_1000']).optional(),
}).strict();

export const participantSchema = z.object({
  user_id: z.string().uuid(),
  confirmed: z.boolean().optional(),
  participating: z.boolean().optional(),
});

export const mvpVoteSchema = z.object({
  voted_user_id: z.string().uuid(),
});

export const matchResultSchema = z.object({
  score_pair1: z.number().int().min(0).max(99),
  score_pair2: z.number().int().min(0).max(99),
  winner_pair_id: z.string().uuid(),
});

export const settingsPatchSchema = z.object({
  action: z.literal('seed').optional(),
}).catchall(z.union([z.string(), z.number(), z.boolean()]));

export const archiveFiltersSchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
  month: z.string().regex(/^\d{1,2}$/).optional(),
  name: z.string().max(100).optional(),
});

export const chatMessageSchema = z.object({
  body: z.string().min(1).max(2000).transform(s => s.trim()),
});

export const createDmSchema = z.object({
  other_user_id: z.string().uuid().optional(),
  tournament_id: z.string().uuid().optional(),
  broadcast: z.boolean().optional(),
}).refine(d => d.other_user_id ?? d.tournament_id ?? d.broadcast, { message: 'Fornire other_user_id, tournament_id o broadcast' });

/** Errore di validazione Zod (restituire 400 invece di 500) */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Helper per validare e restituire errori formattati */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const msg = first?.message ?? 'Dati non validi';
    throw new ValidationError(msg);
  }
  return result.data;
}
