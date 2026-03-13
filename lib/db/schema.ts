import { randomUUID } from 'crypto';
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
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('admin', 'player', 'guest')),
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
    CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
    CREATE INDEX IF NOT EXISTS idx_tournaments_date_status ON tournaments(date, status);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_matches_pair1 ON matches(pair1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_pair2 ON matches(pair2_id);
    CREATE INDEX IF NOT EXISTS idx_pairs_tournament ON pairs(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_pairs_player1 ON pairs(player1_id);
    CREATE INDEX IF NOT EXISTS idx_pairs_player2 ON pairs(player2_id);
    CREATE INDEX IF NOT EXISTS idx_pairs_tournament_seed ON pairs(tournament_id, seed);
    CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_tournament_rankings_tournament ON tournament_rankings(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
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
    db.exec(`ALTER TABLE users ADD COLUMN last_login_at TEXT`);
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
    db.exec(`ALTER TABLE tournaments ADD COLUMN mvp_deadline TEXT`);
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mvp_votes_tournament ON mvp_votes(tournament_id)`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_mvp (
      tournament_id TEXT PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
      mvp_user_id TEXT REFERENCES users(id) ON DELETE CASCADE
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_login_attempts_locked ON login_attempts(locked_until)`);

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

  // Migrazione: tournament_mvp con mvp_user_id nullable (chiudere senza assegnare MVP)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tournament_mvp)").all() as { name: string; type: string; notnull: number }[];
    const mvpCol = tableInfo.find(c => c.name === 'mvp_user_id');
    if (mvpCol?.notnull === 1) {
      db.exec(`
        CREATE TABLE tournament_mvp_new (
          tournament_id TEXT PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
          mvp_user_id TEXT REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      db.exec(`
        INSERT INTO tournament_mvp_new (tournament_id, mvp_user_id)
        SELECT tournament_id, mvp_user_id FROM tournament_mvp WHERE mvp_user_id IS NOT NULL AND mvp_user_id != ''
      `);
      db.exec(`DROP TABLE tournament_mvp`);
      db.exec(`ALTER TABLE tournament_mvp_new RENAME TO tournament_mvp`);
    }
  } catch {
    // ignore
  }

  // Chat: conversazioni e messaggi (DM + gruppi torneo + broadcast + group)
  // Schema con 'group' da subito; la migrazione da dm/tournament/broadcast -> +group
  // avviene SOLO in server.js all'avvio, per evitare race in initSchema tra richieste concorrenti.
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('dm', 'tournament', 'broadcast', 'group')),
      tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`DROP TABLE IF EXISTS _chat_conv_old`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON chat_conversations(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_conversations_tournament ON chat_conversations(tournament_id)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_participants (
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (conversation_id, user_id)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_last_read (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      last_read_at TEXT NOT NULL,
      PRIMARY KEY (user_id, conversation_id)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_last_read_user ON chat_last_read(user_id)`);

  // Galleria immagini e video
  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('image', 'video')),
      mime_type TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_gallery_media_user ON gallery_media(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_gallery_media_created ON gallery_media(created_at DESC)`);

  // Tabella security_logs per logging eventi di sicurezza
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('login_failed', 'auth_401', 'auth_403', 'admin_access')),
      ip TEXT,
      username TEXT,
      path TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(type)`);

  // Tabella page_views per statistiche visualizzazioni
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_views (
      path TEXT NOT NULL,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at)`);

  // Centro sportivo: campi, prenotazioni, slot chiusura
  db.exec(`
    CREATE TABLE IF NOT EXISTS courts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('indoor', 'outdoor')),
      display_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS court_bookings (
      id TEXT PRIMARY KEY,
      court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      slot_start TEXT NOT NULL,
      slot_end TEXT NOT NULL,
      booked_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      guest_name TEXT,
      guest_phone TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_court_bookings_court_date ON court_bookings(court_id, date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_court_bookings_date ON court_bookings(date)`);

  try {
    db.exec(`ALTER TABLE court_bookings ADD COLUMN booking_name TEXT NOT NULL DEFAULT 'Prenotazione'`);
  } catch {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE court_bookings ADD COLUMN tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE`);
  } catch {
    // Column already exists
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_court_bookings_tournament ON court_bookings(tournament_id)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS court_booking_participants (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES court_bookings(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      position INTEGER NOT NULL CHECK(position >= 1 AND position <= 4),
      UNIQUE(booking_id, position)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_court_booking_participants_booking ON court_booking_participants(booking_id)`);

  // Migrazione: user_id nullable + colonne guest per giocatori ospite
  try {
    const cols = db.prepare("PRAGMA table_info(court_booking_participants)").all() as { name: string }[];
    const hasGuest = cols.some((c) => c.name === 'guest_first_name');
    if (!hasGuest) {
      db.exec(`
        CREATE TABLE court_booking_participants_new (
          id TEXT PRIMARY KEY,
          booking_id TEXT NOT NULL REFERENCES court_bookings(id) ON DELETE CASCADE,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          position INTEGER NOT NULL CHECK(position >= 1 AND position <= 4),
          guest_first_name TEXT,
          guest_last_name TEXT,
          guest_phone TEXT,
          UNIQUE(booking_id, position)
        )
      `);
      db.exec(`
        INSERT INTO court_booking_participants_new (id, booking_id, user_id, position)
        SELECT id, booking_id, user_id, position FROM court_booking_participants
      `);
      db.exec(`DROP TABLE court_booking_participants`);
      db.exec(`ALTER TABLE court_booking_participants_new RENAME TO court_booking_participants`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_court_booking_participants_booking ON court_booking_participants(booking_id)`);
    }
  } catch {
    // Migrazione già applicata o errore
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS center_closed_slots (
      id TEXT PRIMARY KEY,
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
      slot_start TEXT NOT NULL,
      slot_end TEXT NOT NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_center_closed_slots_day ON center_closed_slots(day_of_week)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS court_booking_matches (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE REFERENCES court_bookings(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      result_winner INTEGER CHECK(result_winner IN (1, 2)),
      result_set1_c1 INTEGER,
      result_set1_c2 INTEGER,
      result_set2_c1 INTEGER,
      result_set2_c2 INTEGER,
      result_set3_c1 INTEGER,
      result_set3_c2 INTEGER,
      result_entered_at TEXT
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_court_booking_matches_booking ON court_booking_matches(booking_id)`);

  // Seed 4 campi (2 coperti, 2 scoperti) se tabella vuota
  const courtsCount = (db.prepare('SELECT COUNT(*) as c FROM courts').get() as { c: number }).c;
  if (courtsCount === 0) {
    const courtsSeed = [
      { id: randomUUID(), name: 'Campo 1', type: 'indoor', display_order: 1 },
      { id: randomUUID(), name: 'Campo 2', type: 'indoor', display_order: 2 },
      { id: randomUUID(), name: 'Campo 3', type: 'outdoor', display_order: 3 },
      { id: randomUUID(), name: 'Campo 4', type: 'outdoor', display_order: 4 },
    ];
    const insertCourt = db.prepare('INSERT INTO courts (id, name, type, display_order) VALUES (?, ?, ?, ?)');
    for (const c of courtsSeed) {
      insertCourt.run(c.id, c.name, c.type, c.display_order);
    }
  }

  // Migrazione: aggiungere ruolo 'guest' (SQLite non permette ALTER CHECK, ricreiamo users)
  try {
    const schemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string } | undefined;
    if (schemaRow && !schemaRow.sql.includes("'guest'")) {
      const userCols = 'id, username, password_hash, full_name, nickname, role, avatar, must_change_password, skill_level, bio, preferred_side, preferred_hand, created_at, login_count, birth_date, overall_score, is_hidden';
      db.exec(`
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT,
          nickname TEXT,
          role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('admin', 'player', 'guest')),
          avatar TEXT,
          must_change_password INTEGER NOT NULL DEFAULT 0,
          skill_level TEXT CHECK(skill_level IN ('A_GOLD', 'A_SILVER', 'B_GOLD', 'B_SILVER', 'C')),
          bio TEXT,
          preferred_side TEXT CHECK(preferred_side IN ('Destra', 'Sinistra')),
          preferred_hand TEXT CHECK(preferred_hand IN ('Destra', 'Sinistra')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          login_count INTEGER NOT NULL DEFAULT 0,
          birth_date TEXT,
          overall_score INTEGER,
          is_hidden INTEGER NOT NULL DEFAULT 0
        )
      `);
      db.exec(`INSERT INTO users_new (${userCols}) SELECT ${userCols} FROM users`);
      db.exec(`DROP TABLE users`);
      db.exec(`ALTER TABLE users_new RENAME TO users`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name)`);
    }
  } catch {
    // Migration failed or already applied
  }
}
