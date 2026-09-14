-- DOWN 0002_secondary_indexes
-- Safe: drops secondary indexes only. Table rows and FKs are unchanged.

DROP INDEX IF EXISTS clubs_status_idx;
DROP INDEX IF EXISTS teams_club_idx;
DROP INDEX IF EXISTS memberships_club_idx;
DROP INDEX IF EXISTS memberships_member_idx;
DROP INDEX IF EXISTS memberships_club_status_idx;
DROP INDEX IF EXISTS tasks_club_status_idx;
DROP INDEX IF EXISTS tasks_assignee_idx;
DROP INDEX IF EXISTS tasks_deadline_idx;
DROP INDEX IF EXISTS checklist_task_idx;
DROP INDEX IF EXISTS activities_club_idx;
DROP INDEX IF EXISTS activity_part_idx;
DROP INDEX IF EXISTS documents_club_idx;
DROP INDEX IF EXISTS event_links_club_idx;
DROP INDEX IF EXISTS event_links_ext_idx;
DROP INDEX IF EXISTS audit_club_idx;
