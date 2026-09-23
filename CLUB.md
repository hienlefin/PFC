# PFC Club Management — Khung xuyên suốt

> **Đọc file này trước mọi session** liên quan Club / Community ops / `PFC-Management`.  
> Plan chi tiết: [`PFC-Management/CLUB_MANAGEMENT_PLAN.md`](./PFC-Management/CLUB_MANAGEMENT_PLAN.md)  
> Checklist gốc: [`PFC-Management/Club_Management_TodoList.md`](./PFC-Management/Club_Management_TodoList.md)  
> ADR: [`PFC-Management/docs/adr/`](./PFC-Management/docs/adr/)  
> App: [`PFC-Management/apps/club`](./PFC-Management/apps/club)

Không bịa business rule. Không hỏi lại kiến trúc đã chốt trừ khi SRS mâu thuẫn với ADR.

---

## 1. Một câu

**Club Management là hệ điều hành của đúng một Personal Finance Club** (`pfc-investors`): thành viên vào được, có vai trò, có việc, có hoạt động nội bộ, có tài liệu, có báo cáo — và **chỉ gắn** sự kiện từ Shared Event Engine.

Đây là nhánh **MANAGE** trong Digital Hub:

`MANAGE → LEARN → BUILD → EARN → GROW → CONTRIBUTE`

Không phải sản phẩm riêng, không phải SaaS đa CLB, không phải mạng xã hội, không phải job board.

---

## 2. Giàn ý (luôn giữ đúng tầng)

```
PFC Digital Hub (một cộng đồng logic)
 └── Club / Group = Personal Finance Club (duy nhất)
      ├── Team / Ban (chuyên môn, truyền thông, sự kiện, …)
      ├── Membership + Position + Permission
      ├── Task (Kanban / Timeline / Checklist)
      ├── Activity / Campaign  ← nội bộ club  ≠  Event
      ├── Internal Document + ACL
      ├── Club Report
      └── club_event_links → Shared Event Engine (CRUD event ở module khác)
```

| Đúng | Sai |
|------|-----|
| Activity = vận hành nội bộ | Activity = Event có vé |
| Event = engine chung, Club chỉ link | Bảng Event trong Club DB |
| Một club `pfc-investors` | Marketplace / tạo CLB tự do |
| Private club → 403 nếu không phải member | “Ẩn nút” trên UI coi như bảo mật |
| FSM server-side + audit | Client tự set status |

---

## 3. Tính xuyên suốt (không đổi giữa các session)

1. **Một hub, bounded module.** Club không import nội bộ Opportunity / Finance / Marketplace. Dùng `member_id` Platform; không tạo user song song khi đã có Core.
2. **Single-club.** `create_club` bị từ chối. API resolve `getPrimaryClub()` / slug `pfc-investors`.
3. **Trust & quyền trên object.** Deny by default. AuthZ server-side. IDOR / private leak là blocker.
4. **Lifecycle có máy trạng thái.** Membership, Task, Club status, Activity — chỉ transition hợp lệ; 422 nếu nhảy cóc. Membership history append-only.
5. **Event không thuộc Club.** Cấm Event CRUD, ticketing, VNPAY, check-in trong module này. Club: link / unlink / hiển thị / degrade khi event mất.
6. **UI mobile, bám mockup `source/`.** Không vẽ màn “cho đẹp” lệch inventory (COM-09…COM-22, COM-A01…A08).
7. **Production bar.** UI hiện ≠ DONE. Task DONE cần: FR + AC, authz, test, audit, error model. Gates G0→G8 không bỏ.
8. **Không bịa rule.** TBD → mở DEC/ADR, không đoán. Payment / feed / chat chỉ làm nếu scope freeze ghi rõ.

---

## 4. Phạm vi

**Làm (launch Club):** Club/Team, membership, RBAC, task + Kanban/Timeline/checklist, activity, docs + ACL, report, event **link**, audit, notify hooks, authz tests.

**Không làm (module khác):** Event CRUD/vé/check-in/VNPAY · SSO đầy đủ (consume Core) · feed/chat (trừ khi CM-007 freeze in) · Marketplace/ví · Opportunity · Personal Finance · AI · multi-university tenancy.

---

## 5. Vai trò seed (ADR-003)

`owner` · `leader` · `ban_chuyen_mon` · `ban_truyen_thong` · `ban_su_kien` · `member`

Quyền theo **action** (`view_club`, `approve_memberships`, `manage_tasks`, `review_tasks`, `link_events`, …) — không hardcode “nếu là leader thì được hết” rải trong UI.

Visibility: `open` = user đã login có thể xem; `private` = non-member 403. Join private cần duyệt.

---

## 6. Vòng đời (copy khi implement)

**Club:** `draft → active → archived → disbanded` (disband có confirmation + audit; hiện API đang chặn disband — xem plan).

**Membership:** `pending → active | rejected` · `active → inactive | left | alumni` · `inactive → active | left` · `alumni → active` (admin path only). Terminal: `rejected`, `left`.

**Task:** `backlog → todo → in_progress → review → done` · non-terminal → `cancelled` (manage_tasks) · `review → in_progress` (changes requested).

**Activity (hướng):** `draft | active | completed | archived`.

---

## 7. Stack & chỗ sửa code

- App: Next.js · Drizzle · SQLite local (`.data/club.sqlite`, gitignore).
- Domain thuần: `apps/club/src/domain/*` — không import Next/DB.
- Use-case: `src/server/*` · AuthZ `src/lib/authz.ts` · Schema `src/db/schema.ts`.
- UI gọi API `/api/club?action=` — không nhúng FSM vào page.
- Pattern tham chiếu (không copy sản phẩm): Atrium (RBAC/history), ClubHub-Pro (task review), ClubKit (DX).

Demo: `leader@pfc.vn` / `member@pfc.vn` — `PFC123!`

---

## 8. Hiện trạng (để khỏi làm lại từ đầu)

Đã có: ADR G0 · skeleton G1–G5 (schema, FSM, RBAC, Kanban/Timeline, activity/doc meta, event link, UI mobile 5 tab) · test domain Vitest.

Chưa phải production: invite/kick/transfer owner (API P4B đã có) · notify thật · export report · contract Event engine · evidence pack G7–G8 · UI task COM-* (P5.13) · phần lớn CM-* còn lại trên todo.

---

## 9. Protocol session

1. Đọc file này.  
2. Đọc plan + ADR liên quan + todo CM-* của gate đang làm.  
3. Nếu có `source/`: SRS FR-CLB, Screen Inventory COM-*, mockup — **bám đó**.  
4. Implement nhỏ, theo gate; không nhảy G8 khi G2 chưa harden private club.  
5. Mỗi PR: authz + validation + audit (nếu write nhạy cảm) + test.  
6. Cập nhật checkbox plan/todo khi **thật sự** đạt DoD, không chỉ vì UI.

**Cấm:** microservice Club · Event entity trong Club · `create_club` · tin client role/status · commit `.env` / key · god-file trong `route.ts` / page.
