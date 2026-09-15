# ADR-003: RBAC, visibility, Shared Event, data class

## Status
Accepted (G0 / CM-002, CM-003, CM-005, CM-006)

## Context
Atrium permission catalog + ClubKit role gates + SRS private community + PDPA.

## Decision

### Positions (PFC seed)
`owner`, `leader`, `ban_chuyen_mon`, `ban_truyen_thong`, `ban_su_kien`, `member`

### Permissions
`view_club`, `manage_club`, `view_members`, `manage_members`, `approve_memberships`, `manage_roles`, `manage_tasks`, `review_tasks`, `manage_activities`, `manage_documents`, `view_reports`, `link_events`, `view_audit`

Position → permission map seeded in DB (Atrium pattern).

### Visibility
- `open`: authenticated users can view; join may be auto or request (config).
- `private`: non-members get 403 on detail/content; join requires approval.

### Shared Event
Club stores only `club_event_links(club_id, external_event_id, linked_by, linked_at)`. No event payload ownership.

### Data classification
Membership PII + internal documents = **confidential**; retention default 24 months after leave/disband unless Legal overrides.

## Consequences
All mutating routes call `requireClubPermission(clubId, permission)`.
