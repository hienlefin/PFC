# Audit Track 1–5 (CM-100 … CM-506)

**Phạm vi:** `Club_Management_TodoList.md` (Track 1–5), `docs/adr/`, code `apps/club/src` (+ seed/migrate/test/README trong `apps/club` khi cần chứng minh).  
**Không làm:** sửa code, tick ☑ trên TodoList.  
**Tiêu chí ĐỦ:** đúng 10 mục DOD-001 … DOD-010 ở đầu TodoList — không thêm tiêu chí ngoài file đó.

## Cách đọc trạng thái

| Trạng thái | Nghĩa |
|------------|--------|
| **ĐỦ** | Có code **và** đủ DOD-001→010 cho task đó. |
| **THIẾU** | Có hiện diện trong schema/API/UI/domain, nhưng chưa đủ DOD hoặc chưa đủ nội dung task. |
| **CHƯA LÀM** | Không có hiện diện có thể chứng minh trong `apps/club`. |

## Kết luận ngắn

**0 / 64 task ĐỦ.**  
Lý do chung (áp dụng mọi CM-* production): bộ test chỉ có unit domain (`src/domain/domain.test.ts`); **không** có API/integration/UI/security object-level tests; **không** migration rollback versioned; **không** OpenAPI; **không** metrics/alert; **không** backup/restore verify, UAT sign-off, hay production verification. TodoList ghi rõ: không DONE chỉ vì UI đã hiện.

Gap DOD dùng chung (không lặp lại từng dòng trừ khi task có phần riêng):

| DOD | Hiện trạng trong `apps/club` |
|-----|------------------------------|
| DOD-001 | FR/ADR ghi trong comment/README/TodoList; **không** có ma trận test ID → FR cho từng API. |
| DOD-002 | Chỉ `src/domain/domain.test.ts` (FSM + catalog quyền + visibility). Không API/UI test. |
| DOD-003 | Không test IDOR / privilege escalation / private leak ở HTTP. |
| DOD-004 | Không evidence defect tracker / blocker closed. |
| DOD-005 | `migrateUp()` DDL một khối; comment rollback = xóa file SQLite dev; **không** script down. |
| DOD-006 | README mô tả `GET\|POST /api/club`; **không** OpenAPI; env chỉ `CLUB_DB_PATH`. |
| DOD-007 | `writeAudit` + `correlationId` trên JSON; không structured log, không gắn correlation vào audit, không metrics/alert. |
| DOD-008 | Không evidence backup/restore Club. |
| DOD-009 | Không UAT/sign-off. |
| DOD-010 | Không production checklist sau deploy. |

ADR đã đọc: ADR-001 glossary/hierarchy, ADR-002 FSM, ADR-003 RBAC/visibility/event link, ADR-004 scope/threat/capacity, ADR-005 single-club (`pfc-investors`, cấm `create_club`).

---

## Bảng tổng hợp Track 1–5

| Task ID | Trạng thái | Chứng minh / đang thiếu (theo DOD + nội dung task) |
|---------|------------|-----------------------------------------------------|
| CM-100 | THIẾU | Có module `apps/club`. **Thiếu:** CODEOWNERS, ownership file, rule forbidden imports, test ranh giới module. |
| CM-101 | THIẾU | Có `src/db/schema.ts`, `src/db/migrate.ts` (`migrateUp`). **Thiếu:** migration đánh số/versioned, rollback/backward script (DOD-005). |
| CM-102 | THIẾU | Có `seedDemo()` / `scripts/seed.ts` (user, club, team, membership, task, activity, doc, event link). Quyền/role là hằng `src/domain/permissions.ts`, **không** seed bảng role/permission như ADR-003. |
| CM-103 | THIẾU | Có `errorEnvelope` / `AppError` (`src/lib/errors.ts`, `src/app/api/club/route.ts`). **Thiếu:** chuẩn validation (Zod khai báo dependency nhưng **không dùng**), contract test. |
| CM-104 | THIẾU | Có `requireSession`, cookie session (`src/lib/auth.ts`), `requireClubPermission` / `assertCanViewClub` (`src/lib/authz.ts`, `src/server/clubs.ts`). **Thiếu:** middleware authn, session ký/secure cookie, test object-level (DOD-003). Cookie = raw `member.id`. |
| CM-105 | THIẾU | Có `withIdempotency` + bảng `idempotency_keys` (`src/lib/audit.ts`), header `Idempotency-Key` trên POST. **Thiếu:** bắt buộc key cho join/approve/role/task/disband; disband API bị chặn; **không test**. |
| CM-106 | THIẾU | Có `writeAudit` + `audit_events`; gọi từ create club/team/task/activity/doc, join, membership/task transition, assign position, event link, soft-delete doc. **Thiếu:** gắn `correlationId` từ request; audit login/checklist; metrics/alert (DOD-007). |
| CM-107 | THIẾU | Có `newCorrelationId()` trả về JSON. **Thiếu:** structured logging, request-id middleware, log production-critical. |
| CM-108 | CHƯA LÀM | Không job deadline reminder / generate report / purge soft-delete. |
| CM-109 | THIẾU | Có `documents.storage_key` + `registerDocumentMeta`. **Thiếu:** abstraction storage, signed URL, virus-scan policy. |
| CM-110 | CHƯA LÀM | Không feature flag. |
| CM-111 | THIẾU | `GET ?action=health` luôn `{ ok: true }` — **không** kiểm DB/storage readiness. |
| CM-112 | CHƯA LÀM | Không OpenAPI/contract published, không consumer-driven check. |
| CM-113 | THIẾU | Chỉ `CLUB_DB_PATH`. **Thiếu:** parity dev/test/staging/prod. |
| CM-200 | THIẾU | Bảng `clubs`: visibility, status, cover_url, slug, owner. **Thiếu:** settings/branding đầy đủ, test, DOD. |
| CM-201 | THIẾU | Bảng `teams`, `createTeam` / `listTeams`. Entity mỏng (name/description); không test/API docs. |
| CM-202 | THIẾU | Team ⊂ Club trong schema; ADR-001 Community root. **Thiếu:** entity Community trong DB. ADR-005 = 1 club. |
| CM-203 | THIẾU | FSM `src/domain/visibility.ts`, `transitionClubStatus` + audit. API `club_transition` **throw NOT_SUPPORTED**; `create_club` bị cấm (ADR-005). **Thiếu:** confirmation UI, audit qua API, rollback. |
| CM-204 | THIẾU | `canViewClubContent` open = authenticated; `requestJoin` auto-active nếu open. Seed club **private**. Chỉ unit visibility, không API test. |
| CM-205 | THIẾU | Private → 403 `assertCanViewClub`; join pending; `reject_reason`; `transitionMembership`. UI Members chỉ **Duyệt** → `active`, không reject + reason. Không security test. |
| CM-206 | THIẾU | FSM `membership-fsm.ts`; ghi `membership_history` khi transition. `assignPosition` **không** ghi history. Unit FSM only. |
| CM-207 | THIẾU | `assignPosition` + quyền `manage_roles`. Cột `effective_from` / `effective_to` **không ghi**. Không revoke path riêng. |
| CM-208 | THIẾU | Catalog `PERMISSIONS` / `POSITION_PERMISSIONS` khớp ADR-003. Test unit trong `domain.test.ts`. **Thiếu:** seed DB, API test. |
| CM-209 | THIẾU | Map owner/leader/ban_*/member. Không role “moderator” riêng. Không test authorization HTTP. |
| CM-210 | THIẾU | `listMembers` + UI `/members` (tên, email, position). **Thiếu:** profile, privacy (email lộ cho mọi `view_members`), màn Detail. |
| CM-211 | CHƯA LÀM | Không invite link/code, expiry, rate limit. |
| CM-212 | THIẾU | FSM cho `left`/`alumni`; không API kick riêng, không transfer ownership, không UI. |
| CM-213 | THIẾU | Có Directory (`/members`), home, login. `/clubs` redirect `/` (ADR-005). **Thiếu:** Detail, Join, Create/Edit club, My Communities. |
| CM-214 | THIẾU | `/manage` thống kê + duyệt TV gián tiếp. **Thiếu:** quản lý role/community/club đầy đủ. |
| CM-215 | THIẾU | Loading/empty/error banner; `not-found.tsx`. **Thiếu:** 401/403/session expired screens. |
| CM-216 | THIẾU | Unit: member thiếu `approve_memberships`, private cần membership. **Thiếu:** horizontal/vertical escalation, private membership leak (API). |
| CM-217 | THIẾU | Index `memberships_club_status_idx` v.v. `listMembers` **không** pagination; `action=home` load full graph (nguy cơ N+1). |
| CM-300 | THIẾU | `tasks` + index club+status, assignee, deadline. 1 `assignee_id`. Chỉ test FSM, không test model/API. |
| CM-301 | THIẾU | `createTask` + authz `manage_tasks`; cancel qua `transitionTask` + `review_tasks`. **Thiếu:** edit task, validation schema, API test. |
| CM-302 | THIẾU | Gán 1 assignee lúc create. **Thiếu:** multi-assignee, reassign, notification hook. |
| CM-303 | THIẾU | `priority`, `deadline`. **Thiếu:** timezone-aware reminder (cũng không có job CM-108). |
| CM-304 | THIẾU | `assertTaskTransition` trước persist (`src/server/tasks.ts`). Unit `domain.test.ts`. **Thiếu:** API/permission tests. |
| CM-305 | THIẾU | `addChecklistItem`, `toggleChecklistItem`. **Thiếu:** delete, completion integrity, `listChecklist` không expose GET. |
| CM-306 | THIẾU | `proof_of_work` text trên transition. **Thiếu:** attachment storage ACL. |
| CM-307 | THIẾU | Server: `review`→`done` / `in_progress` cần `review_tasks`. UI Kanban chỉ nút → Done. **Thiếu:** changes requested / reject trên UI; test. |
| CM-308 | THIẾU | `kanbanBoard` group theo status; `sort_order` **không dùng**. **Thiếu:** persist column order, concurrent move. |
| CM-309 | THIẾU | `timelineTasks` sort in-memory. **Thiếu:** range query, Gantt. |
| CM-310 | CHƯA LÀM | Không filter/sort assignee, ban/role, priority, overdue, tag (chip UI không lọc). |
| CM-311 | THIẾU | `clubReport.tasks.byStatus` tổng. **Thiếu:** aggregate theo member/ban/period. |
| CM-312 | THIẾU | UI `/tasks`: Kanban + Timeline + create. **Thiếu:** list đầy đủ, detail, review actions. |
| CM-313 | CHƯA LÀM | Không usability test (#466). |
| CM-314 | CHƯA LÀM | Không load test board/status concurrency. |
| CM-400 | THIẾU | Bảng `activities` + `createActivity` (luôn `draft`) + list. **Thiếu:** lifecycle transition, test. |
| CM-401 | THIẾU | Bảng `activity_participants` trong schema/migrate. **Thiếu:** API/rules completion. |
| CM-402 | THIẾU | Activity có `club_id`. **Thiếu:** link Activity ↔ Task. |
| CM-403 | THIẾU | Meta document (title, mime, size, classification). **Thiếu:** versioning, mime allowlist, size limit enforced. |
| CM-404 | THIẾU | Create/soft-delete cần `manage_documents`; list dùng `view_club`. **Thiếu:** ACL role/ban/member, signed download. |
| CM-405 | THIẾU | `deleted_at` + `softDeleteDocument`. **Thiếu:** action API, retention job. |
| CM-406 | THIẾU | `clubReport`: members/tasks/activities/docs/linkedEvents. **Thiếu:** period, engagement. |
| CM-407 | CHƯA LÀM | Không export CSV/XLSX/PDF, không audit download. |
| CM-408 | THIẾU | Activity trên `/events`; doc list + số liệu `/manage` + home. **Thiếu:** docs library, activity CRUD UI, dashboard analytics. |
| CM-409 | CHƯA LÀM | Không test wrong-club doc → 403; không reconcile report. |
| CM-500 | THIẾU | Chỉ `club_event_links` (ADR-001/FR-CLB-010), seed `evt_shared_demo_001`. **Thiếu:** consume Shared Event API/contract. |
| CM-501 | THIẾU | `linkSharedEvent` + `link_events`. **Thiếu:** unlink, authz theo owner type, test. |
| CM-502 | THIẾU | `/events` list link local. Chip filter giả. **Thiếu:** list/filter từ Event engine. |
| CM-503 | THIẾU | Nút “Xem chi tiết” không `href`. **Thiếu:** deep-link detail/register/tickets. |
| CM-504 | CHƯA LÀM | Không degrade khi Event xóa/unpublished. |
| CM-505 | CHƯA LÀM | Search pill trang chủ không index; không tôn trọng permission event. |
| CM-506 | CHƯA LÀM | Không contract test, không staging E2E link event. |

### Đếm

| Trạng thái | Số task |
|------------|---------|
| ĐỦ | 0 |
| THIẾU | 52 |
| CHƯA LÀM | 12 |

CHƯA LÀM: CM-108, CM-110, CM-112, CM-211, CM-310, CM-313, CM-314, CM-407, CM-409, CM-504, CM-505, CM-506.

---

## Track 1 — Foundation (CM-100 … CM-113)

Gate G1 (CI lint/typecheck/unit/security, migrate up/down staging): **chưa đạt.** Có `npm test` / `lint` trong `package.json`; không CI Club; không migrate down.

File nền tảng: `src/db/*`, `src/lib/{auth,authz,audit,errors}.ts`, `src/app/api/club/route.ts`, `src/domain/domain.test.ts`.

## Track 2 — Club / Membership / RBAC (CM-200 … CM-217)

Gate G2 (UAT + security suite + audit verify): **chưa đạt.**

Khớp ADR-005: UI `/clubs`, `/clubs/[id]` redirect; POST `create_club` → `SINGLE_CLUB`.  
Private 403: `assertCanViewClub`.  
Lỗ hổng đối chiếu DOD-003: `listDocuments` / nhiều GET chỉ `view_club`; session cookie không ký.

## Track 3 — Tasks (CM-300 … CM-314)

Gate G3: **chưa đạt** (không E2E leader→member→review→done trên staging; permission tests HTTP không có).

FSM khớp ADR-002 trong `task-fsm.ts`. UI không đủ review/detail/checklist.

## Track 4 — Activities / Docs / Reports (CM-400 … CM-409)

Gate G4: **chưa đạt.** Schema có activity/doc/report counts; không ACL signed download, không export, không integrity test.

## Track 5 — Shared Event (CM-500 … CM-506)

Gate G5: **chưa đạt.** Đúng hướng “không embed Event schema” (`club_event_links` only). Chưa consume engine, unlink, fail-soft, search, contract/E2E.

---

## File chứng minh đã đọc

| Khu vực | Path |
|---------|------|
| Schema/DDL | `src/db/schema.ts`, `src/db/migrate.ts`, `src/db/index.ts` |
| Domain + unit test | `src/domain/{permissions,membership-fsm,task-fsm,visibility,domain.test}.ts` |
| Authz/audit/errors | `src/lib/{auth,authz,audit,errors,single-club}.ts` |
| Server | `src/server/{clubs,tasks,ops}.ts` |
| API | `src/app/api/club/route.ts` |
| UI | `src/app/{page,login,members,tasks,events,manage,not-found,clubs/*}.tsx`, `src/components/*` |
| Seed | `scripts/seed.ts` (gọi `seedDemo`) |
| ADR | `docs/adr/ADR-001` … `ADR-005` |

**Không có:** `CODEOWNERS`, OpenAPI, job runner, storage client, feature flags, test API/E2E/security, export file, Event HTTP client.
