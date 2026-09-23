# CM-703 — Functional: Community Hub + Shared Event link

Refs: Production Checklist #456 (Community Hub), #457 (Event link).

## A. Community Hub (Club shell)

| # | Step | Expected |
|---|------|----------|
| 1 | Mở `/login` → `leader@pfc.vn` / `PFC123!` | Session cookie HMAC |
| 2 | `/` home | Club name, quick stats, không crash |
| 3 | `/members` | List; private non-member không xem được (403 API) |
| 4 | `/tasks` | Kanban/list load |
| 5 | `/events` | Activity nội bộ ≠ Event CRUD |
| 6 | `/manage` | Report + notifications inbox |
| 7 | POST `create_club` | 400 `SINGLE_CLUB` |

Automated proxy: `critical-path.g7.test.ts` + `route.http.test.ts`.

## B. Shared Event link (FR-CLB-010)

| # | Step | Expected |
|---|------|----------|
| 1 | Leader POST `link_event` `{ externalEventId, label }` | `linkId` |
| 2 | GET `events` | Row có `externalEventId`, **không** ticket/price/venue payload |
| 3 | GET `events&unavailable=<id>` | `degraded: true`, `available: false` |
| 4 | POST `unlink_event` | Link biến mất |
| 5 | Member club A không `link_event` club B | 403 |

Automated: `ops.lifecycle.test.ts` (G5 section).

## Sign-off

| Role | Name | Date | Pass? |
|------|------|------|-------|
| QA | | | ☐ |
| Eng | | | ☐ |
