-- Reverse 0009_team_name_unique (index + columns). Data merge is not undone.
DROP INDEX IF EXISTS teams_club_name_norm_uidx;
-- SQLite cannot DROP COLUMN on older versions reliably; leave columns nullable/unused.
