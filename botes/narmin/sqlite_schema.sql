CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  invite_from TEXT,
  user_balance INTEGER NOT NULL DEFAULT 0,
  user_invites TEXT NOT NULL DEFAULT '[]',
  is_vip INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  joined_at INTEGER,
  in_channel INTEGER NOT NULL DEFAULT 0,
  lang TEXT,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users (expires_at);
