-- CM-211 / CM-201 — invite tokens + team ops support
CREATE TABLE IF NOT EXISTS club_invite_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'link',
  email TEXT,
  created_by TEXT NOT NULL REFERENCES members(id),
  expires_at INTEGER,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS club_invite_tokens_club_idx ON club_invite_tokens(club_id);
CREATE INDEX IF NOT EXISTS club_invite_tokens_code_idx ON club_invite_tokens(code);
