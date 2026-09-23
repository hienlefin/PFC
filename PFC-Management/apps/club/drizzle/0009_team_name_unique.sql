-- Team uniqueness: columns + index applied idempotently in migrator.ts
-- (SQLite ALTER ADD COLUMN is not IF NOT EXISTS — see ensureTeamNameUnique).
SELECT 1;
