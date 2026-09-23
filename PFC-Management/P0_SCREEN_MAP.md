# P0 — Map Screen ID → route (Club)

Nguồn: `source/PFC_Digital_Hub_Screen_Inventory_and_Specification_Matrix.docx` (extract `_extracted_inventory/inventory.txt`) · mockup JPG trong `source/` · ADR-005 single-club.

Trạng thái: **sống** — cập nhật khi P4/P9 chốt route. COM-* TBD trong matrix gốc (COM-12 example: `/community/groups/:id`).

## Club launch (FR-CLB) vs UI hiện tại

| Screen ID | Tên inventory | Mockup gần đúng | Route hiện tại | Ghi chú gap |
|-----------|---------------|-----------------|----------------|-------------|
| COM-09 | Member Directory | #125 Quản lý thành viên | `/members` | Có list + chip; thiếu search, tab Thành viên/Ban quản trị/Thành viên mới, CTA Mời, hồ sơ ảnh, ngày tham gia |
| COM-10 | Member Profile | #83 / #84 (hub) | *không có* | Chỉ avatar chữ cái trên row; không màn profile club-scoped |
| COM-11 | Club/Group Directory | #77 Nhóm & CLB, #106 | `/clubs` → redirect `/` | Inventory đa CLB; **ADR-005 một club** — directory marketplace **lệch product** |
| COM-12 | Club/Group Detail | #78 / #107 | `/` (home) | Thiếu cover núi, tab Giới thiệu/Thành viên/Sự kiện, Join, thống kê 12k members mock |
| COM-13 | Join Club/Group | (nút trên #78) | API `join_club` không UI | Không màn join/request |
| COM-14 | Create Club/Group | #116 Tạo câu lạc bộ | API `create_club` **400** | Mockup có form tạo CLB; product chặn — **DEC P1** |
| COM-15 | Club/Group Members | #125 | `/members` | Chip filter không hoạt động (UI-only); không reject pending |
| COM-16 | Club/Group Feed | #73–76, #103–105 | *không có* | ADR-004 **out of launch** trừ khi freeze in |
| COM-17 | Team | — | API `create_team` / `listTeams` | Không UI team/ban |
| COM-18 | Team Detail | — | *không có* | |
| COM-19 | Team Members | — | *không có* | |
| COM-20 | Private Community | — | 403 API | Không empty/forbidden UI riêng |
| COM-21 | Community Notifications | #81 / #86 / #142 | `/manage` item chết | Không inbox |
| COM-22 | My Communities | #77 | redirect home | Single-club: “my communities” = 1 club |
| COM-A01 | Community Management | — | *không có* admin hub | |
| COM-A02 | Club/Group Management | #117 Quản lý câu lạc bộ | `/manage` | Mockup: duyệt TV, quyền, sự kiện, bài viết, giải tán. App: menu + report cards; **giải tán API chặn**; không role UI |
| COM-A03 | Member Management | #125 | `/members` | Duyệt pending có; thiếu mời/kick/role |
| COM-A04 | Role Management | Admin #266 Phân quyền (platform) | API `assign_position` | Không màn phân quyền club |
| COM-A05 | Content Moderation | #268–269 Admin | *không có* | Out nếu không freeze feed |
| COM-A06 | Report Queue | #269 | *không có* | |
| COM-A07 | Private Community Access | — | join pending | Thiếu luồng access request UI |
| COM-A08 | Community Analytics | #126 Báo cáo câu lạc bộ | `/manage` stats | Thiếu chart tháng, sự kiện, hoạt động nổi bật, export |
| FR-CLB-004…006 | Task / Kanban / Timeline | Poster hệ sinh thái (cột 06) | `/tasks` | **Không thấy board mockup số thứ tự** trong 275 màn; UI Kanban thô, không checklist/detail/review copy, filter |
| FR-CLB-007 | Activity | Trộn #118 Event Mgmt? | `/events` section 2 | Activity nằm chung Sự kiện — lệch Activity ≠ Event |
| FR-CLB-008 | Documents | #117 mục? | `/manage` list title | Không thư viện, download, ACL UI |
| FR-CLB-010 | Event **link** | #70–72, #108, #118–120, #140–141 | `/events` | UI hiện ID + label; mockup: ảnh, giá vé, register — **thuộc Event engine**, Club chỉ deep-link |
| EVT-01… | Event CRUD/ticket | #70–72 | *cấm trong Club* | Đúng ADR: không implement trong `apps/club` |

## Shell app (không phải Club module)

Landing #1, Login #2/#95, Register, Home hub #8 (Finance/Learn/Community…), bottom nav **Home · Finance · Learn · Notifications · More**.

App Club hiện: nav **Trang chủ · Thành viên · Công việc · Sự kiện · Quản lý** — **lệch IA toàn hub**; chấp nhận tạm như *Club-only shell* cho đến khi có Platform chrome.

## Traceability tối thiểu (P0)

> Ma trận đầy đủ + file test: [`docs/qa/test-matrix-club.md`](./docs/qa/test-matrix-club.md) (CM-700 / G7).

| Screen | FR | API action | CM-* | Test hiện tại |
|--------|----|------------|------|----------------|
| COM-09/15 | FR-CLB-001/003 | `members`, `membership_transition` | CM-210…216 | `membership.lifecycle.test.ts` |
| COM-12 | FR-CLB-001 | `home`, `club` | CM-200, 213 | `route.http.test.ts` |
| COM-13 | FR-CLB-003 | `join_club` | CM-205 | `membership.lifecycle.test.ts` |
| COM-14 | — | `create_club` rejected | ADR-005 | `route.http.test.ts` |
| COM-A02 | FR-CLB-002/009 | `report`, `audit` | CM-406, 214 | `ops.lifecycle.test.ts` |
| COM-A04 | FR-CLB-002 | `assign_position` | CM-207 | `domain.test.ts` |
| Tasks | FR-CLB-004…006 | `create_task`, `task_transition`, checklist | CM-300…312 | `tasks.lifecycle.test.ts`, `critical-path.g7.test.ts` |
| Events tab | FR-CLB-010 | `events`, `link_event` | CM-500… | `ops.lifecycle.test.ts` |
| Docs | FR-CLB-008 | `documents`, `register_document` | CM-403… | `ops.lifecycle.test.ts` |
| Activity | FR-CLB-007 | `activities`, `create_activity` | CM-400… | `ops.lifecycle.test.ts` |
