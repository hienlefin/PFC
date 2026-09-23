# PFC Club Management — Final Production To-Do

**Mục tiêu:** ship **production-ready Club Management** trong PFC Digital Hub (không prototype / không MVP-only).

**Baseline:**
- SRS v3.0 Production — `FR-CLB-001` … `FR-CLB-010` + cross-module (`FR-X-*`, Core RBAC/Audit/Notification)
- Screen Inventory — `COM-09`…`COM-22`, `COM-A01`…`COM-A08`, Event link `EVT-*`
- Production Checklist — §I Community Hub `#246–#281`, Shared Event `#277–#278` / `#282–#293`, DoD `#DOD-001–010`, Gates, Evidence Pack
- Strategic rules: Private Community **bắt buộc**; Event = **Shared Event Engine** (không nhân đôi trong Club); auth **server-side**; mọi lifecycle có state machine

**Luồng bắt buộc:** Foundation → Domain Club → Cross-module contracts → Security/Compliance → QA/UAT → Staging → Production (có rollback + post-release verification).

---

## Production Definition of Done (áp dụng mọi task CM-*)

Một task **chỉ DONE** khi đủ:

| ID | Tiêu chí |
|----|----------|
| DOD-001 | Có requirement ID + acceptance criteria + traceability (design/test) |
| DOD-002 | Có unit + API/integration (+ UI) tests phù hợp |
| DOD-003 | Authorization/security tests critical pass (gồm object-level) |
| DOD-004 | Không còn blocker/critical defect |
| DOD-005 | Migration có rollback/backward strategy |
| DOD-006 | API docs + env config cập nhật |
| DOD-007 | Logs, metrics, audit, alert cho flow production-critical |
| DOD-008 | Backup/restore & rollback impact của module đã được xem xét / verify |
| DOD-009 | UAT/business sign-off khi thuộc release gate |
| DOD-010 | Production verification checklist pass sau deploy |

**Không đánh dấu DONE** chỉ vì “UI đã hiện”.

---

## Release Gates (Club Management)

| Gate | Điều kiện mở gate | Exit criteria |
|------|-------------------|---------------|
| **G0** | Decisions & ADR | CM-0* xong, không còn TBD blocking |
| **G1** | Platform foundation sẵn cho module Club | CI/CD, migration, secrets, observability hook |
| **G2** | Club + Membership + RBAC production | Private club 403 harden; audit; IDOR tests green |
| **G3** | Tasks + Kanban + Timeline + Checklist | State machine + leader review + permission tests |
| **G4** | Activity + Documents + Reports | ACL docs + report metrics đúng ownership |
| **G5** | Shared Event link production | Contract ổn định; không duplicate Event entity |
| **G6** | Cross-cutting production | Notify, moderation, search index, NFR |
| **G7** | QA / UAT / Staging sign-off | Evidence pack Club đầy đủ |
| **G8** | Production go-live | Smoke + rollback rehearsal + post-release verify |

---

## Track 0 — Decisions & Production Scope Freeze

| ID | Task | Checklist / FR | Done |
|----|------|----------------|:----:|
| CM-000 | Freeze glossary production: Community → Club/Group → Team; Activity ≠ Event | #008, FR-CLB | ☑ |
| CM-001 | Freeze membership state machine + transition rules (server-enforced) | #254, FR-CLB-003 | ☑ |
| CM-002 | Freeze role/ban matrix PFC (permissions theo action) | #255–#256, FR-CLB-002 | ☑ |
| CM-003 | Freeze visibility policies: Open vs Private (+ approval) | #249–#252 | ☑ |
| CM-004 | Freeze task state machine + who may transition | #267, FR-CLB-004 | ☑ |
| CM-005 | ADR: Shared Event Engine; Club chỉ link; cấm Event CRUD trong Club | #277–#278, FR-CLB-010 | ☑ |
| CM-006 | ADR: data classification cho membership/docs (internal/confidential) + retention | PDPA / SRS §14 | ☑ |
| CM-007 | Freeze production launch scope Club (in/out) theo SRS — change control có ID | #004–#005 | ☑ |
| CM-008 | Threat model Club: IDOR, privilege escalation, private leak, doc exfil | Security | ☑ |
| CM-009 | Capacity assumptions Club (members/club, tasks, docs, concurrent ops) ghi vào NFR | SRS capacity | ☑ |

**Gate G0 exit:** mọi DEC/ADR merged; không tự bịa rule từ TBD.

---

## Track 1 — Engineering Foundation (Production-grade)

| ID | Task | Done |
|----|------|:----:|
| CM-100 | Module boundary `club` (ownership, CODEOWNERS, forbidden imports) | ☐ |
| CM-101 | DB schema + migrations versioned + rollback scripts | ☐ |
| CM-102 | Seed/reference: roles, permissions, statuses, system club config | ☐ |
| CM-103 | API error envelope + validation standards cho Club endpoints | ☐ |
| CM-104 | Authn middleware + **server-side** authz + object-level helpers | ☐ |
| CM-105 | Idempotency cho write critical (join approve, role assign, task status, disband) | ☐ |
| CM-106 | Audit-event utility gắn mọi hành động nhạy cảm Club | ☐ |
| CM-107 | Structured logging + correlation/request ID | ☐ |
| CM-108 | Background jobs: deadline reminders, report generation, soft-delete purge | ☐ |
| CM-109 | File/object storage abstraction cho documents (signed URL, virus scan policy) | ☐ |
| CM-110 | Feature flags cho gradual Club rollout | ☐ |
| CM-111 | Health checks phụ thuộc Club (DB, storage) trong readiness | ☐ |
| CM-112 | OpenAPI/contracts published; consumer-driven checks nếu có | ☐ |
| CM-113 | Environments: dev / test / staging / prod parity cho Club config | ☐ |

**Gate G1 exit:** CI chạy lint/typecheck/unit/security checks; migrate up/down OK trên staging.

---

## Track 2 — Club / Membership / RBAC (Production)

*FR-CLB-001…003 · Screens COM-09…15, COM-22, COM-A01…A04 · #246–#257*

| ID | Task | Done |
|----|------|:----:|
| CM-200 | Entity Club/Group production fields (visibility, status, branding, settings) | ☐ |
| CM-201 | Entity Team under Club (full, không “optional”) | ☑ create/update/delete + assign |
| CM-202 | Hierarchy PFC Community root → Club/Group → Team | ☐ |
| CM-203 | Club lifecycle: create → active → archived → disband (+ confirmation + audit) | ☐ |
| CM-204 | Open Community access rules | ☐ |
| CM-205 | Private Club + membership approval/rejection + reasons | ☐ |
| CM-206 | Membership lifecycle + append-only history | ☐ |
| CM-207 | Role assignment + effective dates + revoke | ☑ assign_position UI |
| CM-208 | Permission catalog: view/create/edit/approve/manage theo domain Club | ☐ |
| CM-209 | Owner/moderator/leader scoped permissions | ☐ |
| CM-210 | Member directory & profiles trong Club (privacy-aware) | ☐ |
| CM-211 | Invite flow (link/code) + expiry + rate limit | ☑ invite + link + redeem |
| CM-212 | Remove/kick member + transfer ownership (safe path) | ☑ kick+anonymize + transfer |
| CM-213 | UI Member App: Directory, Detail, Join, Members, Create/Edit, My Communities | ☐ |
| CM-214 | UI Admin: Community/Club/Member/Role management | ☐ |
| CM-215 | All screens: loading / empty / error / 401 / 403 / 404 / session expired | ☐ |
| CM-216 | Security tests: horizontal/vertical escalation, private membership leak | ☐ |
| CM-217 | Performance: member list pagination, indexes, N+1 guard | ☐ |

**Gate G2 exit:** UAT membership + RBAC; security suite green; audit verify.

---

## Track 3 — Tasks / Kanban / Timeline / Checklist (Production)

*FR-CLB-004…006 · #262–#273*

| ID | Task | Done |
|----|------|:----:|
| CM-300 | Task domain model + indexes (club, assignee, status, deadline) | ☐ |
| CM-301 | Create/edit/cancel với validation + authz | ☐ |
| CM-302 | Multi-assignee / reassign + notification hooks | ☐ |
| CM-303 | Priority + deadline + timezone-aware reminders | ☐ |
| CM-304 | Server-enforced status transitions | ☐ |
| CM-305 | Checklist items CRUD + completion integrity | ☐ |
| CM-306 | Progress / proof-of-work attachments (storage ACL) | ☐ |
| CM-307 | Leader review: approve / changes requested / reject completion | ☐ |
| CM-308 | Kanban board (persist column order; concurrent move safe) | ☐ |
| CM-309 | Timeline/Gantt-style by deadline (range queries) | ☐ |
| CM-310 | Filters/sort: assignee, ban/role, priority, overdue, tag | ☐ |
| CM-311 | Task reporting aggregates (per member/ban/period) | ☐ |
| CM-312 | UI: list + Kanban + Timeline + detail + review actions | ☐ |
| CM-313 | Usability tests club task flow (#466) | ☐ |
| CM-314 | Load test nhẹ: board fetch & status updates under concurrency | ☐ |

**Gate G3 exit:** end-to-end leader→member→review→done trên staging; permission tests pass.

---

## Track 4 — Activities / Internal Documents / Reports (Production)

*FR-CLB-007…009 · #258–#261, #274–#276 · COM-A08*

| ID | Task | Done |
|----|------|:----:|
| CM-400 | Activity/Campaign entity + lifecycle + owner | ☐ |
| CM-401 | Participation tracking + completion rules | ☐ |
| CM-402 | Link Activity ↔ Tasks (optional) và ↔ Club | ☐ |
| CM-403 | Internal Documents: versioning metadata, mime allowlist, size limits | ☐ |
| CM-404 | Document ACL theo role/ban/member + signed download | ☐ |
| CM-405 | Soft-delete + retention job theo policy | ☐ |
| CM-406 | Internal Reports: period metrics (members, tasks, activities, linked events, engagement) | ☐ |
| CM-407 | Export CSV + XLSX + PDF (authz + audit download) | ☐ |
| CM-408 | UI: Activity, Docs library, Club analytics/report dashboard | ☐ |
| CM-409 | Integrity tests: wrong-club doc ID → 403; report numbers reconcile | ☐ |

**Gate G4 exit:** club leader chạy report tháng + tải doc nội bộ an toàn trên staging.

---

## Track 5 — Shared Event Integration (Production contract)

*FR-CLB-010 · #277–#278, #282–#283, #293 · EVT read surfaces*

| ID | Task | Done |
|----|------|:----:|
| CM-500 | Consume Shared Event API/contract (không embed Event schema trong Club DB) | ☐ |
| CM-501 | Link/unlink Event ↔ Club với authz owner types | ☐ |
| CM-502 | Club Detail: Events tab (list/filter từ Event engine) | ☐ |
| CM-503 | Deep-links: Event detail / register / tickets (Event module) | ☐ |
| CM-504 | Failure modes: Event deleted/unpublished → Club UI degrade an toàn | ☐ |
| CM-505 | Search index: Club-linked events tôn trọng permission (#298 related) | ☐ |
| CM-506 | Contract tests + staging E2E link event | ☐ |

> Ticketing / VNPAY / check-in thuộc Shared Event & Payment tracks — Club chỉ tích hợp production-ready hooks, không re-implement.

**Gate G5 exit:** tạo event (engine) gắn Club; member thấy đúng quyền; không có bảng Event duplicate.

---

## Track 6 — Cross-cutting Production Hardening

*#279–#281 · Notification/Search/Moderation/NFR*

| ID | Task | Done |
|----|------|:----:|
| CM-600 | Moderation/report cho Club content (nếu có feed/group posts trong scope freeze) | ☑ out of launch (no feed) |
| CM-601 | Notifications: join, role, task assign, deadline, activity, doc share | ☑ |
| CM-602 | Email/push channel abstraction; preference-aware | ☑ Resend/webhook adapters + stub fallback |
| CM-603 | Club search/discovery indexes; exclude private unauthorized | ☑ |
| CM-604 | Rate limiting: join, invite, upload, task move | ☑ |
| CM-605 | i18n VI + EN (production strings complete) | ☑ (catalog baseline) |
| CM-606 | Accessibility baseline cho Club screens | ☑ (skip-link + focus; no maxScale lock) |
| CM-607 | Observability: metrics (joins, tasks completed, 403 rate), dashboards, alerts | ☑ (in-process metrics + alert log) |
| CM-608 | PII handling: export/delete membership data theo privacy requests | ☑ |
| CM-609 | Admin analytics COM-A08 production (not mock) | ☑ (month buckets on clubReport) |
| CM-610 | Runbooks: incident Club (leak, mass kick, bad disband), rollback notes | ☑ |

**Gate G6 exit:** alerts thử trên staging; privacy export/delete path verified.

---

## Track 7 — QA, UAT, Evidence, Go-Live

| ID | Task | Done |
|----|------|:----:|
| CM-700 | Test matrix map Screen ID → FR → API → Test case → CM task | ☑ `docs/qa/test-matrix-club.md` |
| CM-701 | Automated: unit / API / integration / E2E Club critical paths | ☑ vitest + `critical-path.g7.test.ts` (no browser E2E yet) |
| CM-702 | Security regression pack (IDOR, RBAC, private club) in CI | ☑ `test:security` + CI job `security` |
| CM-703 | Functional tests Community Hub (#456) + Shared Event link (#457) | ☑ script `docs/qa/functional-community-hub-event-link.md` |
| CM-704 | UAT script cho Club Leader + Member + Admin | ☑ `docs/qa/uat-script-leader-member-admin.md` |
| CM-705 | Business sign-off Club Management | ☑ template (chờ chữ ký) |
| CM-706 | Staging soak + backup/restore impact verification (Club tables/files) | ☑ procedure (chờ chạy staging) |
| CM-707 | Rollback rehearsal (migrate down / feature flag off) | ☑ procedure (chờ log) |
| CM-708 | Production config/secrets review cho Club | ☑ checklist + `.env.example` |
| CM-709 | Production smoke: create club, approve member, task flow, doc download, event link | ☐ G8 / template sẵn `smoke-script-club.md` |
| CM-710 | Post-release verification + monitoring watch window | ☐ G8 / template sẵn |
| CM-711 | Training materials cho club leader/admin (#532 related) | ☑ outline |
| CM-712 | **Evidence Pack** hoàn tất (xem dưới) | ☑ index + stubs (attach khi có CI/UAT) |

**Gate G7–G8 exit:** evidence attached; production verification pass; không critical defect mở.

---

## Mandatory Evidence Pack (Club)

| EVD | Nội dung |
|-----|----------|
| EVD-CM-01 | ADR + scope freeze |
| EVD-CM-02 | ERD/state machines (Membership, Task, Activity, Club) |
| EVD-CM-03 | OpenAPI Club + authz matrix |
| EVD-CM-04 | Test reports (unit/API/E2E/security) |
| EVD-CM-05 | UAT sign-off |
| EVD-CM-06 | Staging backup/restore note cho Club data |
| EVD-CM-07 | Rollback rehearsal log |
| EVD-CM-08 | Production smoke results |
| EVD-CM-09 | Monitoring dashboards + alert screenshots |
| EVD-CM-10 | Privacy/retention confirmation cho membership & documents |

---

## Traceability

| Requirement | Production tasks |
|-------------|------------------|
| FR-CLB-001 | CM-210, CM-213 |
| FR-CLB-002 | CM-002, CM-207–209, CM-216 |
| FR-CLB-003 | CM-001, CM-205–206, CM-212 |
| FR-CLB-004 | CM-300–307 |
| FR-CLB-005 | CM-308–309 |
| FR-CLB-006 | CM-305 |
| FR-CLB-007 | CM-400–402 |
| FR-CLB-008 | CM-403–405 |
| FR-CLB-009 | CM-406–408 |
| FR-CLB-010 | CM-005, CM-500–506 |
| FR-CORE audit/notify/RBAC | CM-106, CM-601–602, Track 2 |
| NFR security/ops | Track 1, 6, 7 |

---

## Explicitly out of Club module (owned elsewhere — vẫn phải integrate)

| Capability | Owner module | Club responsibility |
|------------|--------------|---------------------|
| Event CRUD, tickets, check-in, VNPAY | Shared Event + Payment | Link + display + authz |
| Global identity login/SSO | Platform Core | Consume Member ID |
| Full community social feed/chat | Community content (nếu tách epic) | Chỉ nếu CM-007 freeze **in** |
| Marketplace / points wallet | Marketplace / Loyalty | Out |

Nếu freeze quyết định **đưa Group Feed vào Club launch**, bổ sung epic `CM-8xx` (post/comment/moderation) trước G6 — không làm tắt/mở tùy tiện lúc code.

---

## Sequencing (production calendar — tham chiếu)

| Sprint | Focus | Gate |
|--------|-------|------|
| S0 | Decisions, threat model, module skeleton | G0 |
| S1 | Foundation + Club/Membership/RBAC | G1→G2 |
| S2 | Tasks / Kanban / Timeline / Checklist | G3 |
| S3 | Activity / Docs / Reports | G4 |
| S4 | Event contracts + cross-cutting harden | G5→G6 |
| S5 | QA/UAT/Evidence/Staging | G7 |
| S6 | Production go-live + watch | G8 |

Điều chỉnh length theo team size; **không bỏ Gate** để “ship sớm”.

---

## Cursor / Agent rule (rút từ Production Checklist)

1. Không implement theo kiểu “vẽ từng màn hình”.  
2. Không bịa business rule từ TBD — mở DEC gate.  
3. Mọi API: contract + validation + authorization + error model + logging + test.  
4. Mọi entity lifecycle: state transition rules server-side.  
5. Mọi retry/webhook liên quan Club: idempotent.  
6. Release: Dev → Test/QA → Staging/UAT → Production + rollback + post-verify.
