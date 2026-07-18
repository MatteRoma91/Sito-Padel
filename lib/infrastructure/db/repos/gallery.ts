import { cache } from 'react';
import { getDb } from '@/lib/db/db';
import { initSchema } from '@/lib/db/schema';
import { seed } from '@/lib/db/seed';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '@/lib/constants';
import type { User, Tournament, TournamentParticipant, Pair, Match, TournamentRanking, CumulativeRanking, SkillLevel, TournamentCategory, Court, CourtBooking, CourtBookingParticipant, CenterClosedSlot, CourtBookingMatch, TournamentFormat } from '@/lib/types';
import { overallScoreToLevel, overallLevelToSkillLevel, MATCH_WIN_DELTA, MATCH_LOSS_DELTA, TOURNAMENT_WIN_DELTA, TOURNAMENT_LAST_DELTA, TOURNAMENT_WIN_DELTA_8, TOURNAMENT_LAST_DELTA_8, TOURNAMENT_LAST_POSITION_8, getTournamentFormat, getLastRankingPosition } from '@/lib/types';
import { DEFAULT_SITE_CONFIG } from '@/lib/db/site-config-defaults';
import { ensureDb } from './ensure';

// ============ GALLERY ============

export interface GalleryMedia {
  id: string;
  filename: string;
  file_path: string;
  size_bytes: number;
  type: 'image' | 'video';
  mime_type: string;
  user_id: string;
  created_at: string;
}

export function insertGalleryMedia(data: {
  filename: string;
  file_path: string;
  size_bytes: number;
  type: 'image' | 'video';
  mime_type: string;
  user_id: string;
}): string {
  ensureDb();
  const id = randomUUID();
  getDb().prepare(
    `INSERT INTO gallery_media (id, filename, file_path, size_bytes, type, mime_type, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.filename, data.file_path, data.size_bytes, data.type, data.mime_type, data.user_id);
  return id;
}

export function getGalleryMedia(options?: { limit?: number; offset?: number }): GalleryMedia[] {
  ensureDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  return getDb().prepare(
    'SELECT * FROM gallery_media ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as GalleryMedia[];
}

export function getGalleryMediaCount(): number {
  ensureDb();
  const row = getDb().prepare('SELECT COUNT(*) as c FROM gallery_media').get() as { c: number };
  return row?.c ?? 0;
}

export function getGalleryMediaById(id: string): GalleryMedia | undefined {
  ensureDb();
  return getDb().prepare('SELECT * FROM gallery_media WHERE id = ?').get(id) as GalleryMedia | undefined;
}

export function deleteGalleryMedia(id: string): boolean {
  ensureDb();
  const r = getDb().prepare('DELETE FROM gallery_media WHERE id = ?').run(id);
  return r.changes > 0;
}

export function getGalleryTotalSize(): number {
  ensureDb();
  const row = getDb().prepare('SELECT COALESCE(SUM(size_bytes), 0) as total FROM gallery_media').get() as { total: number };
  return row?.total ?? 0;
}

