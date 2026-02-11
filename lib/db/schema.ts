import { getDb } from './db';
import { DEFAULT_SITE_CONFIG } from './site-config-defaults';

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
      category TEXT NOT NULL DEFAULT 'master_1000',
      max_players INTEGER NOT NULL DEFAULT 16,
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
      round TEXT NOT NULL CHECK(round IN ('quarterfinal', 'semifinal', 'final', 'third_place', 'consolation_semi', 'consolation_final', 'consolation_seventh', 'round_robin')),
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
  try {
    db.exec(`ALTER TABLE tournaments ADD COLUMN completed_at TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE cumulative_rankings ADD COLUMN mvp_count INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Tabella mvp_votes e tournament_mvp
  db.exec(`
    CREATE TABLE IF NOT EXISTS mvp_votes (
      tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      voter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      voted_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (tournament_id, voter_user_id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_mvp (
      tournament_id TEXT PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
      mvp_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
    )
  `);

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

  // Match round for girone all'italiana
  try {
    db.exec(`ALTER TABLE matches RENAME TO _matches_old`);
    db.exec(`
      CREATE TABLE matches (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        round TEXT NOT NULL CHECK(round IN ('quarterfinal', 'semifinal', 'final', 'third_place', 'consolation_semi', 'consolation_final', 'consolation_seventh', 'round_robin')),
        bracket_type TEXT NOT NULL DEFAULT 'main' CHECK(bracket_type IN ('main', 'consolation')),
        pair1_id TEXT REFERENCES pairs(id),
        pair2_id TEXT REFERENCES pairs(id),
        score_pair1 INTEGER,
        score_pair2 INTEGER,
        winner_pair_id TEXT REFERENCES pairs(id),
        order_in_round INTEGER NOT NULL DEFAULT 0
      )
    `);
    db.exec(`
      INSERT INTO matches (id, tournament_id, round, bracket_type, pair1_id, pair2_id, score_pair1, score_pair2, winner_pair_id, order_in_round)
      SELECT id, tournament_id, round, bracket_type, pair1_id, pair2_id, score_pair1, score_pair2, winner_pair_id, order_in_round
      FROM _matches_old
    `);
    db.exec(`DROP TABLE _matches_old`);
  } catch {
    // Table already in new format or migration failed; ignore to avoid breaking startup
  }

  // Max players per tournament format
  try {
    db.exec(`ALTER TABLE tournaments ADD COLUMN max_players INTEGER NOT NULL DEFAULT 16`);
  } catch {
    // Column already exists
  }

  // Overall score 0-100 per livello di gioco
  try {
    db.exec(`ALTER TABLE users ADD COLUMN overall_score INTEGER`);
  } catch {
    // Column already exists
  }

  // is_hidden flag per nascondere giocatori dalla vista
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Tabella site_config per pannello impostazioni
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  const insertStmt = db.prepare('INSERT OR IGNORE INTO site_config (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SITE_CONFIG)) {
    insertStmt.run(key, value);
  }

  // Migrazione: BroccoChallenger ha 4 posizioni (non 8) - correggi testi se hanno la vecchia versione
  try {
    const broccoClassifica = db.prepare('SELECT value FROM site_config WHERE key = ?').get('text_regolamento_classifica_punti_brocco') as { value: string } | undefined;
    if (broccoClassifica?.value?.includes('8° = 0') || broccoClassifica?.value?.includes('2° = 330')) {
      db.prepare('UPDATE site_config SET value = ? WHERE key = ?')
        .run('1° = 500 pt, 2° = 250, 3° = 175, 4° = 80.', 'text_regolamento_classifica_punti_brocco');
    }
    const modalita8 = db.prepare('SELECT value FROM site_config WHERE key = ?').get('text_regolamento_modalita_8') as { value: string } | undefined;
    if (modalita8?.value?.includes('8° = 0') || modalita8?.value?.includes('2° = 330')) {
      db.prepare('UPDATE site_config SET value = ? WHERE key = ?')
        .run("Torneo a 8 giocatori (4 coppie): si disputa in girone all'italiana (round-robin). La categoria è fissa BroccoChallenger 500. Punti ATP per posizione: 1° = 500, 2° = 250, 3° = 175, 4° = 80.", 'text_regolamento_modalita_8');
    }
  } catch {
    // ignore
  }

  // Tabella login_attempts per rate limiting (blocco per IP+username, non solo IP)
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT NOT NULL,
      username TEXT NOT NULL,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (ip, username)
    )
  `);

  // Migrazione da schema vecchio (ip unico) a nuovo (ip+username)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(login_attempts)").all() as { name: string }[];
    const hasAttemptedUsername = tableInfo.some(c => c.name === 'attempted_username');
    const hasUsername = tableInfo.some(c => c.name === 'username');
    if (hasAttemptedUsername && !hasUsername) {
      db.exec(`ALTER TABLE login_attempts RENAME TO login_attempts_old`);
      db.exec(`
        CREATE TABLE login_attempts (
          ip TEXT NOT NULL,
          username TEXT NOT NULL,
          failed_count INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT NOT NULL DEFAULT '',
          PRIMARY KEY (ip, username)
        )
      `);
      db.exec(`
        INSERT OR IGNORE INTO login_attempts (ip, username, failed_count, locked_until)
        SELECT ip, COALESCE(NULLIF(attempted_username, ''), 'unknown'), failed_count, locked_until
        FROM login_attempts_old WHERE locked_until != ''
      `);
      db.exec(`DROP TABLE login_attempts_old`);
    }
  } catch {
    // Migrazione fallita o non necessaria
  }
}
