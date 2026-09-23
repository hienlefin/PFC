# Club threat model (CM-008 / P1.9)

Launch surface: Next.js app + SQLite, session cookie `pfc_club_session`.

| ID | Threat | Attack | Mitigation (now) | Residual |
|----|--------|--------|------------------|----------|
| T-01 | IDOR club/task/doc IDs | Guess `taskId` / `documentId` of another club | `requireClubPermission` on resource.clubId; missing membership → 403 | Need API tests with two clubs in G2 (product is single-club; still test object-level) |
| T-02 | Vertical privilege | Member sets `position: owner` in body | Ignore client role; `assertPositionPermission` server-side | UI must not be the control |
| T-03 | Horizontal privilege | Member approves join / reviews task | member seed lacks `approve_memberships` / `review_tasks` → 403 | Ban matrix drift |
| T-04 | Private club leak | Unauthenticated or non-member GET home/members | `assertCanViewClubContent` → 401 / 403 | List pagination must not include private clubs (single-club: only `pfc-investors`) |
| T-05 | Document exfil | List API returns `storageKey` / unsigned path | Redact key; signed download TTL; mime/size allowlist; virus-scan fail-closed | Real object store + scanner in staging |
| T-06 | Disband / multi-club | `create_club` / `disband` | HTTP 400 SINGLE_CLUB / NOT_SUPPORTED | — |
| T-07 | Replay writes | Double approve / link event | `Idempotency-Key` | Keys not TTL-purged yet |

P8 CI should replay T-01…T-04 as security pack.
