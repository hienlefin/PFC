-- P4B / FR-CLB-003: join reason + append-only membership history.
ALTER TABLE memberships ADD COLUMN join_reason TEXT;

CREATE TRIGGER IF NOT EXISTS membership_history_no_update
BEFORE UPDATE ON membership_history
BEGIN
  SELECT RAISE(ABORT, 'membership_history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS membership_history_no_delete
BEFORE DELETE ON membership_history
BEGIN
  SELECT RAISE(ABORT, 'membership_history is append-only');
END;

CREATE INDEX IF NOT EXISTS tasks_club_deadline_idx ON tasks(club_id, deadline);
