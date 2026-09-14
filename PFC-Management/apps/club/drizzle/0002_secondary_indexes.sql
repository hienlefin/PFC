-- CM-101 / 0002_secondary_indexes
-- Same indexes as src/db/schema.ts (no new columns). Rollback-safe: DROP INDEX only.

CREATE INDEX IF NOT EXISTS clubs_status_idx ON clubs(status);
CREATE INDEX IF NOT EXISTS teams_club_idx ON teams(club_id);
CREATE INDEX IF NOT EXISTS memberships_club_idx ON memberships(club_id);
CREATE INDEX IF NOT EXISTS memberships_member_idx ON memberships(member_id);
CREATE INDEX IF NOT EXISTS memberships_club_status_idx ON memberships(club_id, status);
CREATE INDEX IF NOT EXISTS tasks_club_status_idx ON tasks(club_id, status);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks(deadline);
CREATE INDEX IF NOT EXISTS checklist_task_idx ON task_checklist_items(task_id);
CREATE INDEX IF NOT EXISTS activities_club_idx ON activities(club_id);
CREATE INDEX IF NOT EXISTS activity_part_idx ON activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS documents_club_idx ON documents(club_id);
CREATE INDEX IF NOT EXISTS event_links_club_idx ON club_event_links(club_id);
CREATE INDEX IF NOT EXISTS event_links_ext_idx ON club_event_links(external_event_id);
CREATE INDEX IF NOT EXISTS audit_club_idx ON audit_events(club_id);
