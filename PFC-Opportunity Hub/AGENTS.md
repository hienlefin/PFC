# AGENTS.md — PFC Opportunity Hub

Bạn đang implement **Opportunity Hub** trong PFC Digital Hub. Tuân thủ pack kiến trúc trong folder này + SRS v3.0. **Không bịa business rule.**

## Non-negotiables

1. Bounded module: namespace API + schema `opp_` / package `opportunity`; không import nội bộ Finance/Marketplace/Community.
2. Identity duy nhất: dùng Platform `member_id`; không tạo user song song.
3. Lifecycle Opportunity: `Draft → Pending → Verified|Rejected → Expired` chỉ qua transition server-side + audit.
4. Public catalog chỉ opportunity đủ điều kiện publish (Verified / Trusted policy) và chưa Expired.
5. Apply: hỗ trợ Internal + External; External **ghi application trước redirect**; idempotent.
6. Verification tiered; không “verified” chỉ ở frontend.
7. Reminder/Expiry = jobs; không gửi notification hàng loạt trong request handler.
8. Object-level authorization mọi read/write nhạy cảm; CV private + signed URL.
9. Mọi thay đổi verification / application status → audit event.
10. Task DONE khi có test (unit/API) + evidence; map Screen ID (OPP-*) và checklist 220–245 khi có thể.

## Module hoá + SRP (bắt buộc khi viết code)

1. **Một module = một biên giới:** `domain/` (FSM, policy thuần), `server/` hoặc `services/` (use-case), `db/` (schema/query), `lib/` (authz/audit/errors), UI chỉ gọi API/use-case — không nhúng business vào page.
2. **Một file / class / function = một lý do đổi:** tách Catalog vs Application vs Verification vs Reminder vs Report; không gom “god service”.
3. **Phụ thuộc một chiều:** UI → application → domain; infrastructure implement port/interface Platform (AuthZ, Storage, Jobs, Notification, Search). Domain **không** import Next/DB driver.
4. **FSM & policy ở domain thuần** (testable không DB); server chỉ orchestrate + persist + audit.
5. **Tách đọc/ghi khi phức tạp:** list/browse khác apply/verify; tránh handler vừa filter vừa đổi lifecycle.

Bám cấu trúc Club app: `domain/*-fsm.ts` + `lib/authz.ts` + `server/*.ts` — Opportunity làm tương tự với prefix `opp_`.

## Security by Design (bắt buộc khi viết code)

Thiết kế bảo mật **trước** feature UI; không “secure later”.

1. **Deny by default:** mọi endpoint/action require auth + permission tường minh; public chỉ catalog đã Verified/Trusted + chưa Expired.
2. **AuthZ server-side, object-level:** kiểm tra owner/provider/reviewer/member trên resource; không tin body/client role; không lộ Draft/Pending cho người lạ.
3. **Trust boundary:** status Verified / verification tier / application status **chỉ** đổi qua transition server + audit; client không self-verify.
4. **Validate & sanitize input:** Zod (hoặc tương đương) ở biên API; whitelist field; giới hạn file CV (type/size); outbound URL chỉ https + allowlist scheme.
5. **Least privilege data:** CV/private attachment qua signed URL TTL ngắn; không trả raw storage path; list API không leak PII ứng viên cho role không đủ quyền.
6. **Idempotency & anti-abuse:** apply/save idempotent theo `(member_id, opportunity_id)`; rate-limit apply/report nếu Platform hỗ trợ.
7. **Audit & fail closed:** đổi verification/application/report → audit event; lỗi AuthZ → 403, không partial write.
8. **Secrets:** không hardcode key; không commit `.env` / deploy key; log không ghi CV nội dung hay token.

Checklist nhanh trước merge: *Ai gọi được? Trên object nào? Input đã validate? Dữ liệu nhạy cảm đã giảm tối thiểu? Có audit?*

## Trước khi code

1. Đọc `architecture.md`, `data-model.md`, ADRs.  
2. Xác định interface phụ thuộc Platform (AuthZ, Notification, Search, Storage, Jobs).  
3. Viết/ cập nhật contract API + state transition table.  
4. Implement + test theo DoD checklist PFC.

## Cấm

- Microservice Opportunity “cho vui”.
- AI investment/career advice trong module này.
- Payment trong Apply (payment thuộc Marketplace nếu có).
- Client tự set status Verified.
- Bỏ qua report/takedown.
- God-file / logic nghiệp vụ trong React page hoặc API route “ôm hết”.
- Tin client cho permission, status, hoặc “đã verified”.
