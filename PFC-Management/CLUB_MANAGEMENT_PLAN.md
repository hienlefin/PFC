# Club Management — Plan chi tiết

Nguồn sự thật cho **thứ tự làm**. Khung tư duy: [`CLUB.md`](../CLUB.md). Checklist ID gốc: [`Club_Management_TodoList.md`](./Club_Management_TodoList.md). ADR: [`docs/adr/`](./docs/adr/).

**Mục tiêu:** Club Management production trong PFC Digital Hub — một club `pfc-investors` — đủ G0→G8, không prototype.

**Code:** `PFC-Management/apps/club`  
**Màn hình SRS:** COM-09…COM-22, COM-A01…COM-A08, Event surfaces EVT-* (file trong `source/` khi có).  
**FR:** FR-CLB-001 … FR-CLB-010 + Core RBAC / Audit / Notification.

---

## Cách dùng file này

- Làm **theo phase** (P0 → P10). Không đảo gate để “ship UI trước”.
- Mỗi bước: **Mục đích · Làm gì · Liên quan · Xong khi**.
- Đánh `[x]` chỉ khi đạt DoD (todo: DOD-001…010) — không đánh vì “trang đã hiện”.
- Nếu SRS/mockup mâu thuẫn ADR: **dừng, mở DEC**, không bịa.

### DoD rút gọn mỗi hạng mục

Contract API · validate · authz object-level · FSM nếu có lifecycle · audit write nhạy cảm · idempotency write critical · test (unit/API, security nếu quyền) · UI loading/empty/error/401/403/404 · không leak private.

---

## Bản đồ yêu cầu → kế hoạch

| FR | Ý | Phase |
|----|---|-------|
| FR-CLB-001 | Directory / profile club, privacy-aware | P4, P9 |
| FR-CLB-002 | RBAC / position / permission | P4 |
| FR-CLB-003 | Membership lifecycle | P4 |
| FR-CLB-004 | Task create/assign/review | P5 |
| FR-CLB-005 | Kanban + Timeline | P5 |
| FR-CLB-006 | Checklist | P5 |
| FR-CLB-007 | Activity / campaign | P6 |
| FR-CLB-008 | Internal documents + ACL | P6 |
| FR-CLB-009 | Club reports + export | P6 |
| FR-CLB-010 | Shared Event link | P7 |
| Core | Auth consume, audit, notify, search, NFR | P3, P8 |
| Screens | COM-* bám mockup | P9 |
| Go-live | QA, UAT, evidence, prod | P10 |

---

## Hiện trạng code (baseline 2026-09)

**Đã có (đừng làm lại nền):**

- ADR-001…005 (glossary, FSM, RBAC, launch scope, single-club).
- Schema: `clubs`, `teams`, `memberships` + `membership_history`, `tasks` + `task_checklist_items`, `activities` + `activity_participants`, `documents`, `club_event_links`, `audit_events`, `idempotency_keys`, `members` (auth local).
- Domain: membership/task/club visibility FSM, permission catalog.
- API `GET|POST /api/club` (action): login, home, members, tasks, report, activities, documents, events, audit, join, membership_transition, assign_position, create_team, create_task, task_transition, checklist, create_activity, register_document, link_event.
- Chặn: `create_club`, `club_transition` (disband).
- UI mobile: `/` `/members` `/tasks` `/events` `/manage` `/login` (+ `/clubs` lệch single-club — xử lý P9).
- Vitest domain.

**Còn thiếu / mỏng (plan nhắm vào đây):**

- Invite, kick, transfer owner, join reasons đầy đủ.
- Multi-assignee, filter task, PoW file ACL, concurrent Kanban.
- Activity FSM + participation + link task.
- Document: versioning, mime/size, signed URL, retention job.
- Report export CSV/XLSX/PDF.
- Event: contract thật, unlink, fail-soft unpublished, không chỉ `externalEventId` + label.
- Notify, jobs, rate limit, search private-safe.
- Platform Auth (thay `members` local khi Core sẵn).
- OpenAPI, CI, staging, evidence pack.
- UI state đầy đủ + bám `source/` mockup.

---

## P0 — Khởi động session & kho tài liệu

**Mục đích:** Mọi agent/người cùng một bản đồ; không tải SRS lần nữa nếu đã có trong repo.

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P0.1 | Confirm `CLUB.md` + ADR + todo + file này | Root, `.cursor/rules` | Agent đọc được 4 nguồn |
| P0.2 | Đưa/kiểm `source/`: SRS v3.0, Screen Inventory COM-*, checklist #246–#281, mockup | `source/` | Có map Screen ID → route |
| P0.3 | Bảng truy vết sống: Screen → FR → API action → CM-* → test | CM-700 | File/table trong repo |
| P0.4 | Chạy app local: `npm install` · `npm run db:seed` · `npm run test` · `npm run dev` | `apps/club` | Login leader + member OK |
| P0.5 | Ghi gap mockup vs UI hiện tại (5 tab) | P9 | List lệch (không sửa hết ở P0) |

---

## P1 — Đóng quyết định còn mở (Gate G0)

G0 ADR đã Accepted. Chỉ làm P1 nếu SRS/mockup **mâu thuẫn** hoặc còn TBD.

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P1.1 | Confirm glossary Community → Club → Team; Activity ≠ Event | ADR-001, CM-000 | Không còn dùng từ lẫn |
| P1.2 | Confirm FSM membership/task | ADR-002, CM-001, CM-004 | Bảng transition = code `*-fsm.ts` |
| P1.3 | Confirm matrix position → permission | ADR-003, CM-002 | Seed = `permissions.ts` |
| P1.4 | Confirm Open vs Private | ADR-003, CM-003 | Private 403 đã test |
| P1.5 | Confirm Event chỉ link | ADR-001/003, CM-005 | Không có bảng Event payload |
| P1.6 | Confirm single-club | ADR-005 | `create_club` 400 |
| P1.7 | Confirm launch in/out (feed? disband?) | ADR-004, CM-007 | DEC ghi: disband API hiện NOT_SUPPORTED — **chốt** bật theo SRS hay giữ chặn đến post-launch |
| P1.8 | Data class + retention 24 tháng | ADR-003, CM-006, PDPA | Policy gắn docs/membership |
| P1.9 | Threat model: IDOR, privilege, private leak, doc exfil | CM-008 | Mục P8 test bám threat |
| P1.10 | Capacity: indexes list, p95 list | CM-009 | Ghi NFR trong test/perf note |

**Gate G0:** không TBD blocking.

---

## P2 — Biên giới module & hợp đồng với Hub

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P2.1 | Ownership: `CODEOWNERS`, cấm import Opportunity/Finance | CM-100 | Lint/boundary note |
| P2.2 | Namespace API ổn định (giữ `/api/club` hoặc version `/api/v1/club/*` — **một** hướng, ADR nếu đổi) | CM-112 | Documented |
| P2.3 | Interface Platform: Auth, Notification, Storage, Jobs, Search — port/adapter, Club không giả remote lung tung | Opportunity `AGENTS.md` pattern | File `src/platform/` hoặc tương đương |
| P2.4 | Shared Event contract: `external_event_id`, quyền đọc, unpublished/deleted | FR-CLB-010, CM-500 | Spec 1 trang + fixture |
| P2.5 | Identity: map `members` local → `member_id` Core khi Core có | P8 | Adapter, không đổi FSM |

---

## P3 — Foundation production (Gate G1)

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P3.1 | Migration versioned + rollback script (SQLite dev; Postgres staging/prod khi freeze stack) | CM-101 | up/down trên staging ghi nhận |
| P3.2 | Seed: club `pfc-investors`, positions, permissions, statuses | CM-102 | Idempotent seed |
| P3.3 | Error envelope thống nhất (code, message, correlationId) — đã có `errors.ts`, hoàn thiện map 401/403/404/409/422 | CM-103 | Mọi route dùng envelope |
| P3.4 | Session authn + `requireClubPermission` mọi write/read nhạy cảm | CM-104 | Không endpoint “tin body.role” |
| P3.5 | Idempotency: join approve, role assign, task status, disband (nếu bật), link event | CM-105 | Header `Idempotency-Key` + test replay |
| P3.6 | Audit mọi hành động nhạy cảm (join, kick, role, task review, doc, event link, report export) | CM-106 | `audit_events` đủ action |
| P3.7 | Structured log + correlation ID (đã có mầm) | CM-107 | Request ID xuyên UI→API |
| P3.8 | Jobs worker: deadline task, report gen, soft-delete purge | CM-108 | Không gửi notify trong request path |
| P3.9 | Storage abstraction: signed URL, mime allowlist, size limit, virus-scan policy | CM-109 | Không trả raw path |
| P3.10 | Feature flags Club | CM-110 | Flag doc |
| P3.11 | Health/readiness: DB (+ storage) | CM-111 | `action=health` đủ phụ thuộc |
| P3.12 | OpenAPI Club + authz matrix | CM-112, EVD-CM-03 | File published |
| P3.13 | Env parity dev/test/staging/prod | CM-113 | `.env.example` đủ |
| P3.14 | CI: lint, typecheck, unit, security pack | G1 exit | Pipeline xanh |

**Gate G1:** CI + migrate up/down staging.

---

## P4 — Club / Membership / RBAC (Gate G2)

*Screens COM-09…15, COM-22, COM-A01…A04 · #246–#257*

### 4A — Entity & lifecycle club/team

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P4.1 | Field production: visibility, status, branding, settings | CM-200 | Schema + API get/update (owner/leader) |
| P4.2 | Team CRUD đầy đủ dưới club | CM-201 | Member gán `teamId` |
| P4.3 | Hierarchy root → club → team (single club: root ẩn, không UX multi-club) | CM-202, ADR-005 | Không directory “tạo CLB” |
| P4.4 | Club lifecycle + confirmation + audit **theo DEC P1.7** | CM-203 | Nếu launch không disband: giữ 400 + test; nếu có: FSM + 2-step confirm |

### 4B — Membership

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P4.5 | Open: rule xem/join (auto vs request) | CM-204 | Config + test |
| P4.6 | Private: request join, approve/reject + reason | CM-205 | Non-member 403 content |
| P4.7 | FSM + append-only history mọi transition | CM-206 | History không sửa |
| P4.8 | Assign/revoke position + effectiveFrom/To | CM-207 | Audit |
| P4.9 | Permission catalog đủ action Club | CM-208, CM-209 | Map seed + test vertical/horizontal |
| P4.10 | Directory + profile privacy-aware | CM-210, FR-CLB-001 | List không leak PII thừa |
| P4.11 | Invite link/code + expiry + rate limit | CM-211 | Hết hạn 410/422 |
| P4.12 | Kick + transfer ownership (path an toàn, không orphan club) | CM-212 | Test: không tự demote owner cuối |

### 4C — UI + security G2

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P4.13 | Member app: directory, detail, join, members, edit (single club), my club | CM-213 | Bám COM-* |
| P4.14 | Admin/leader: member/role management | CM-214, COM-A* | |
| P4.15 | Mọi màn: loading/empty/error/401/403/404/session | CM-215 | |
| P4.16 | Security tests: IDOR membership, private leak, privilege | CM-216 | CI |
| P4.17 | Pagination member list, index, N+1 guard | CM-217 | p95 mục tiêu |

**Gate G2:** UAT join/approve/RBAC; security suite xanh; private harden.

---

## P5 — Tasks / Kanban / Timeline / Checklist (Gate G3)

*FR-CLB-004…006 · #262–#273*

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P5.1 | Model + index club/assignee/status/deadline | CM-300 | Query list/board/timeline |
| P5.2 | Create/edit/cancel + validate + authz | CM-301 | Cancel chỉ manage_tasks |
| P5.3 | Assignee (multi nếu SRS; hiện schema 1 assignee — **đúng SRS**) | CM-302 | Notify hook assign |
| P5.4 | Priority + deadline + TZ reminder job | CM-303 | Job P3.8 |
| P5.5 | Transition server `task-fsm.ts` | CM-304 | 422 illegal |
| P5.6 | Checklist CRUD + integrity (task tồn tại, cùng club) | CM-305, FR-CLB-006 | |
| P5.7 | Proof-of-work attachment + storage ACL | CM-306 | Signed URL |
| P5.8 | Leader review: approve / changes requested / reject completion | CM-307 | `review → done \| in_progress` |
| P5.9 | Kanban persist sortOrder; concurrent move an toàn | CM-308, FR-CLB-005 | |
| P5.10 | Timeline/Gantt theo deadline | CM-309 | Range query |
| P5.11 | Filter/sort: assignee, ban, priority, overdue, tag | CM-310 | |
| P5.12 | Aggregate report per member/ban/period | CM-311 | Dùng lại P6 report |
| P5.13 | UI list + board + timeline + detail + review | CM-312 | COM-* |
| P5.14 | Usability task flow | CM-313, #466 | Note UAT |
| P5.15 | Load nhẹ board + status concurrency | CM-314 | Ghi kết quả |

**Gate G3:** E2E leader→member→review→done trên staging; permission tests.

---

## P6 — Activity / Documents / Reports (Gate G4)

*FR-CLB-007…009 · #258–#261, #274–#276 · COM-A08*

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P6.1 | Activity entity + FSM + owner | CM-400 | |
| P6.2 | Participation + completion rules | CM-401 | `activity_participants` |
| P6.3 | Link Activity ↔ Tasks (optional) ↔ Club | CM-402 | Schema link nếu SRS bắt |
| P6.4 | Documents: version meta, mime allowlist, size | CM-403 | Reject file lạ |
| P6.5 | ACL theo role/ban/member + signed download | CM-404 | Wrong-club ID → 403 |
| P6.6 | Soft-delete + retention job | CM-405, 24 tháng | |
| P6.7 | Report kỳ: members, tasks, activities, linked events, engagement | CM-406, FR-CLB-009 | Số reconcile test |
| P6.8 | Export CSV + XLSX + PDF; authz + audit download | CM-407 | |
| P6.9 | UI Activity, docs library, analytics | CM-408 | |
| P6.10 | Integrity tests doc/report | CM-409 | |

**Gate G4:** Leader chạy report tháng + tải doc nội bộ an toàn.

---

## P7 — Shared Event (Gate G5)

*FR-CLB-010 · #277–#278, #282–#283, #293*

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P7.1 | Consume Event API — **không** embed Event schema | CM-500 | Adapter + fixture unpublished |
| P7.2 | Link/unlink + authz `link_events` | CM-501 | Unique (club, external_event_id) |
| P7.3 | Club Detail tab Events: list/filter từ engine | CM-502 | |
| P7.4 | Deep-link detail / register / tickets (module Event) | CM-503 | Club không render checkout |
| P7.5 | Event xóa/ẩn → UI degrade | CM-504 | Không 500 |
| P7.6 | Search index tôn trọng permission | CM-505, #298 | Private không lộ |
| P7.7 | Contract test + E2E staging | CM-506 | |

**Không làm trong Club:** ticketing, VNPAY, check-in.

**Gate G5:** Gắn event từ engine; member thấy đúng quyền; không duplicate Event.

---

## P8 — Cross-cutting (Gate G6)

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P8.1 | Moderation/report content **chỉ nếu** freeze in feed | CM-600 | Skip + ghi “out of launch” nếu không |
| P8.2 | Notify: join, role, task assign, deadline, activity, doc share | CM-601 | Qua Notification Core |
| P8.3 | Email/push + preference | CM-602 | |
| P8.4 | Search/discovery club; loại private unauthorized | CM-603 | |
| P8.5 | Rate limit: join, invite, upload, task move | CM-604 | |
| P8.6 | i18n VI + EN | CM-605 | String production |
| P8.7 | A11y baseline Club screens | CM-606 | |
| P8.8 | Metrics: joins, tasks done, 403 rate; dashboard/alert | CM-607 | |
| P8.9 | PII export/delete membership (privacy request) | CM-608 | |
| P8.10 | Admin analytics COM-A08 thật | CM-609 | Không mock số |
| P8.11 | Runbook: leak, mass kick, bad disband, rollback | CM-610 | |

**Gate G6:** Alert thử staging; privacy path verify.

---

## P9 — UI / UX Club (xuyên suốt, chốt trước UAT)

Nguyên tắc: **mobile-first**, bám `source/` mockup, 5 cụm thông tin user: Trang chủ · Thành viên · Công việc · Sự kiện · Quản lý.

| # | Việc | Ghi chú |
|---|------|---------|
| P9.1 | Map COM-09…22, COM-A01…A08 → route Next | Bảng P0.3 |
| P9.2 | Trang chủ: hero, quick actions, thống kê thật | `/` |
| P9.3 | Thành viên: list, filter ban, join/pending, profile | `/members` |
| P9.4 | Công việc: list/Kanban/Timeline/detail/review | `/tasks` |
| P9.5 | Sự kiện: chỉ linked events + CTA sang Event | `/events` |
| P9.6 | Quản lý: team, role, docs, activity, report, audit | `/manage` |
| P9.7 | Login/session expired | `/login` |
| P9.8 | Gỡ hoặc ẩn `/clubs` create-directory nếu lệch single-club | ADR-005 |
| P9.9 | Empty/error/403 private copy tiếng Việt | CM-215 |
| P9.10 | Design tokens PFC (logo, màu) thống nhất Opportunity Hub | `public/pfc-logo.png` |

---

## P10 — QA, UAT, Evidence, Go-live (Gate G7–G8)

| # | Việc | Liên quan | Xong khi |
|---|------|-----------|----------|
| P10.1 | Ma trận Screen → FR → API → test → CM | CM-700 | |
| P10.2 | Automated unit / API / integration / E2E critical | CM-701 | |
| P10.3 | Security regression trong CI | CM-702 | |
| P10.4 | Functional Community Hub + Event link | CM-703, #456–457 | |
| P10.5 | UAT script Leader + Member + Admin | CM-704 | |
| P10.6 | Business sign-off | CM-705 | |
| P10.7 | Staging soak + backup/restore Club | CM-706, EVD-CM-06 | |
| P10.8 | Rollback rehearsal | CM-707, EVD-CM-07 | |
| P10.9 | Secrets/config review | CM-708 | |
| P10.10 | Prod smoke: (không create club) join/approve, task flow, doc download, event link | CM-709 | |
| P10.11 | Post-release watch | CM-710 | |
| P10.12 | Training leader/admin | CM-711, #532 | |
| P10.13 | Evidence pack EVD-CM-01…10 | CM-712 | |

**Smoke production (single-club):** login · xem club private đúng quyền · approve member · gán việc · review done · tải doc · link event · 403 user lạ.

---

## Thứ tự sprint (tham chiếu)

| Sprint | Phase | Gate |
|--------|-------|------|
| S0 | P0–P2 | G0 |
| S1 | P3–P4 | G1→G2 |
| S2 | P5 | G3 |
| S3 | P6 + P9 song song | G4 |
| S4 | P7–P8 | G5→G6 |
| S5 | P10 | G7 |
| S6 | Go-live | G8 |

Không bỏ gate. P9 có thể làm dần từ S1 nhưng **không** thay DoD backend.

---

## Việc liên quan ngoài folder `apps/club` (vẫn thuộc nhánh Club)

| Hạng mục | Ở đâu | Club cần |
|----------|--------|----------|
| SRS / mockup / inventory | `source/` | Bám UI + FR |
| ADR | `PFC-Management/docs/adr/` | Không contradict |
| Cursor rules | `.cursor/rules/` + `CLUB.md` | Session start |
| Opportunity Hub | `PFC-Opportunity Hub/` | Không import; học pattern module/ADR |
| Shared Event | Module Event (chưa folder) | Contract P7 |
| Platform Core Auth/Notify/Search | chưa trong repo | Port P2.3 |
| BeeCount | `BeeCount-Cloud/` | Không phải Club |
| References Atrium/ClubHub/ClubKit | `PFC-Management/References/` | Pattern only |

---

## Cấm trong mọi bước

- Tạo nhiều club / `create_club`.
- CRUD Event, vé, VNPAY trong Club.
- Nhúng FSM vào React page.
- Trust role/status từ client.
- Payment, AI matching, microservice Club.
- Đánh DONE chỉ vì UI.
- Commit secret, `.env`, deploy key, `apps/club/.data/`.
