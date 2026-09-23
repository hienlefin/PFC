/** ADR-004 / CM-009 / P1.10 — capacity & index expectations. */

export const CAPACITY = {
  clubsSoftCap: 10_000,
  membersPerClub: 5_000,
  tasksPerClub: 50_000,
  docsPerClub: 10_000,
  p95ClubListMs: 300,
} as const;

/** Indexes required for list pagination (must exist in migrate-up). */
export const REQUIRED_INDEXES = [
  "clubs_status_idx",
  "teams_club_idx",
  "memberships_club_idx",
  "memberships_member_idx",
  "memberships_club_status_idx",
  "tasks_club_status_idx",
  "tasks_assignee_idx",
  "tasks_deadline_idx",
  "tasks_club_deadline_idx",
  "checklist_task_idx",
  "activities_club_idx",
  "activity_part_idx",
  "documents_club_idx",
  "event_links_club_idx",
  "event_links_ext_idx",
  "audit_club_idx",
] as const;
