-- DOWN 0004_membership_p4b
DROP INDEX IF EXISTS tasks_club_deadline_idx;
DROP TRIGGER IF EXISTS membership_history_no_delete;
DROP TRIGGER IF EXISTS membership_history_no_update;
ALTER TABLE memberships DROP COLUMN join_reason;
