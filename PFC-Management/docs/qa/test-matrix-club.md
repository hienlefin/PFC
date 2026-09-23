# CM-700 — Test matrix Club (Screen → FR → API → Test → CM)

Nguồn route: [`P0_SCREEN_MAP.md`](../../P0_SCREEN_MAP.md).  
Cập nhật khi thêm vitest / màn UI.

| Screen / area | FR | API `action` | CM-* | Automated test |
|---------------|----|--------------|------|----------------|
| COM-09/15 Members | FR-CLB-001/003 | `members`, `membership_transition`, `kick_member` | CM-210…216, P4B | `membership.lifecycle.test.ts`, `access.test.ts` |
| COM-12 Home / detail | FR-CLB-001 | `home`, `club` | CM-200, 213 | `route.http.test.ts` (private 403) |
| COM-13 Join | FR-CLB-003 | `join_club` | CM-205 | `membership.lifecycle.test.ts`, `g6.lifecycle.test.ts` (notify) |
| COM-14 Create club | ADR-005 | `create_club` → 400 | ADR-005 | `route.http.test.ts`, `access.test.ts` |
| COM-20 Private | FR-CLB-001 | any club GET | CM-216 | `route.http.test.ts`, `access.test.ts`, `object-authz.test.ts` |
| COM-21 Notifications | — | `notifications`, `notify_prefs` | CM-601 | `g6.lifecycle.test.ts`, `route.http.test.ts` |
| COM-A02 Manage | FR-CLB-002/009 | `report`, `audit` | CM-406, 214 | `ops.lifecycle.test.ts` (report RBAC) |
| COM-A03 Member mgmt | FR-CLB-003 | `kick_member`, `transfer_owner`, `assign_position` | CM-207… | `membership.lifecycle.test.ts`, `audit-sensitive.test.ts` |
| COM-A04 Roles | FR-CLB-002 | `assign_position` | CM-207 | `domain.test.ts`, `audit-sensitive.test.ts` |
| COM-A08 Analytics | FR-CLB-009 | `report` | CM-609 | `g6.lifecycle.test.ts` (month buckets) |
| Tasks / Kanban / Timeline | FR-CLB-004…006 | `create_task`, `task_transition`, `review_task`, checklist, `reorder_kanban` | CM-300…312 | `tasks.lifecycle.test.ts`, `task-policy.test.ts` |
| Activity | FR-CLB-007 | `create_activity`, `activity_transition` | CM-400… | `ops.lifecycle.test.ts` |
| Documents | FR-CLB-008 | `documents`, `register_document`, `soft_delete_document`, `authorize_download` | CM-403… | `ops.lifecycle.test.ts`, `platform.test.ts` (signed URL) |
| Event link | FR-CLB-010 | `events`, `link_event`, `unlink_event` | CM-500… | `ops.lifecycle.test.ts`, `module-boundary.test.ts` |
| Ready / migrate | NFR | `ready`, migrator | CM-101 | `migrate.test.ts`, `route.http.test.ts` (ready) |
| Search | CM-603 | `search` | CM-603 | `g6.lifecycle.test.ts`, `route.http.test.ts` |
| Rate limit | CM-604 | join / upload / task move | CM-604 | `g6.lifecycle.test.ts` |
| Privacy | CM-608 | `export_pii`, `privacy_anonymize` | CM-608 | `g6.lifecycle.test.ts` |
| Critical path | FR-CLB-* | multi-action | CM-701 | `critical-path.g7.test.ts` |

## Gaps UI (không chặn G7 backend)

COM-10 profile · COM-16 feed (out) · COM-17…19 team UI · COM-A05/A06 moderation (out) · browser E2E Playwright (chưa).
