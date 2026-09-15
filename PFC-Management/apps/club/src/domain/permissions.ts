/**
 * Permission catalog — adapted from Atrium position_permissions pattern
 * for PFC Club Management (ADR-003).
 */
export const PERMISSIONS = [
  "view_club",
  "manage_club",
  "view_members",
  "manage_members",
  "approve_memberships",
  "manage_roles",
  "manage_tasks",
  "review_tasks",
  "manage_activities",
  "manage_documents",
  "view_reports",
  "link_events",
  "view_audit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const POSITIONS = [
  "owner",
  "leader",
  "ban_chuyen_mon",
  "ban_truyen_thong",
  "ban_su_kien",
  "member",
] as const;

export type Position = (typeof POSITIONS)[number];

/** Default position → permissions (seed) */
export const POSITION_PERMISSIONS: Record<Position, Permission[]> = {
  owner: [...PERMISSIONS],
  leader: [
    "view_club",
    "manage_club",
    "view_members",
    "manage_members",
    "approve_memberships",
    "manage_roles",
    "manage_tasks",
    "review_tasks",
    "manage_activities",
    "manage_documents",
    "view_reports",
    "link_events",
    "view_audit",
  ],
  ban_chuyen_mon: [
    "view_club",
    "view_members",
    "manage_tasks",
    "review_tasks",
    "manage_activities",
    "manage_documents",
    "view_reports",
  ],
  ban_truyen_thong: [
    "view_club",
    "view_members",
    "manage_tasks",
    "manage_activities",
    "manage_documents",
    "view_reports",
  ],
  ban_su_kien: [
    "view_club",
    "view_members",
    "manage_tasks",
    "manage_activities",
    "link_events",
    "view_reports",
  ],
  member: ["view_club", "view_members"],
};

export function positionHasPermission(
  position: Position,
  permission: Permission,
): boolean {
  return POSITION_PERMISSIONS[position]?.includes(permission) ?? false;
}
