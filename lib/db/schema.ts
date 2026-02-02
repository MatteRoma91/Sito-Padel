import { getDb } from './db';

export function initSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      nickname TEXT,
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('admin', 'player')),
      avatar TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      skill_level TEXT CHECK(skill_level IN ('A_GOLD', 'A_SILVER', 'B_GOLD', 'B_SILVER', 'C')),
      bio TEXT,
      preferred_side TEXT CHECK(preferred_side IN ('Destra', 'Sinistra')),
      preferred_hand TEXT CHECK(preferred_hand IN ('Destra', 'Sinistra')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      venue TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'in_progress', 'completed')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournament_participants (
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      confirmed INTEGER NOT NULL DEFAULT 0,
      participating INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tournament_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS pairs (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player1_id TEXT NOT NULL REFERENCES users(id),
      player2_id TEXT NOT NULL REFERENCES users(id),
      seed INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      round TEXT NOT NULL CHECK(round IN ('quarterfinal', 'semifinal', 'final', 'third_place', 'consolation_semi', 'consolation_final', 'consolation_seventh')),
      bracket_type TEXT NOT NULL DEFAULT 'main' CHECK(bracket_type IN ('main', 'consolation')),
      pair1_id TEXT REFERENCES pairs(id),
      pair2_id TEXT REFERENCES pairs(id),
      score_pair1 INTEGER,
      score_pair2 INTEGER,
      winner_pair_id TEXT REFERENCES pairs(id),
      order_in_round INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tournament_rankings (
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      pair_id TEXT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      points INTEGER NOT NULL,
      is_override INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tournament_id, pair_id)
    );

    CREATE TABLE IF NOT EXISTS cumulative_rankings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      total_points INTEGER NOT NULL DEFAULT 0,
      is_override INTEGER NOT NULL DEFAULT 0,
      gold_medals INTEGER NOT NULL DEFAULT 0,
      silver_medals INTEGER NOT NULL DEFAULT 0,
      bronze_medals INTEGER NOT NULL DEFAULT 0,
      wooden_spoons INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(date);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_pairs_tournament ON pairs(tournament_id);
  `);

  // Migration: add new columns to existing database
  try {
    db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN skill_level TEXT CHECK(skill_level IN ('A_GOLD', 'A_SILVER', 'B_GOLD', 'B_SILVER', 'C'))`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN bio TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN preferred_side TEXT CHECK(preferred_side IN ('Destra', 'Sinistra'))`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN preferred_hand TEXT CHECK(preferred_hand IN ('Destra', 'Sinistra'))`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN login_count INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN birth_date TEXT`);
  } catch {
    // Column already exists
  }

  // Medal columns for cumulative_rankings
  try {
    db.exec(`ALTER TABLE cumulative_rankings ADD COLUMN gold_medals INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE cumulative_rankings ADD COLUMN silver_medals INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE cumulative_rankings ADD COLUMN bronze_medals INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE cumulative_rankings ADD COLUMN wooden_spoons INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Tournament category (Grande Slam / Master 1000)
  try {
    db.exec(`ALTER TABLE tournaments ADD COLUMN category TEXT NOT NULL DEFAULT 'master_1000'`);
  } catch {
    // Column already exists
  }

  // Overall score 0-100 per livello di gioco
  try {
    db.exec(`ALTER TABLE users ADD COLUMN overall_score INTEGER`);
  } catch {
    // Column already exists
  }
}
