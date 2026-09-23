-- ADR-008 — map Club member → Platform Core member_id
CREATE TABLE IF NOT EXISTS member_platform_ids (
  member_id TEXT PRIMARY KEY NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  platform_member_id TEXT NOT NULL UNIQUE,
  linked_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS member_platform_ids_platform_idx
  ON member_platform_ids(platform_member_id);
