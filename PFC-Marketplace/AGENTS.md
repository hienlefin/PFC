# AGENTS.md — PFC Marketplace

Bạn đang implement **Marketplace** trong PFC Digital Hub. Tuân thủ pack kiến trúc trong folder này + SRS v3.0. **Không bịa business rule.**

## Non-negotiables

1. Bounded module: namespace API marketplace + schema/prefix `mkt_` / models `Mkt*`; không import nội bộ Finance/Opportunity/Community.
2. Identity duy nhất: Platform `member_id`; không tạo user song song.
3. Listing lifecycle chỉ qua transition server-side + audit; public chỉ `Published`.
4. Order phải qua Cart → Checkout → Payment (BR-007). Price/inventory validate **server-side**; snapshot giá lúc tạo order.
5. Payment qua **port/adapter**; UI không chứa logic VNPAY. Local dùng Mock; production primary VNPAY (Q03/Q20).
6. Mọi checkout/pay/callback **idempotent**; không nhân đôi order/payment (BR-012).
7. Không sửa lịch sử transaction làm mất audit — chỉ append event / status hợp lệ.
8. Review chỉ khi đủ điều kiện (BR-008) — mặc định sau `COMPLETED`.
9. COURSE / EVENT_TICKET chỉ **link ID** sang Education / Shared Event; không CRUD event/course trong module này.
10. Task DONE khi có test (unit/API) + map Screen ID (MKT/SELL/PAY) và checklist #169–#219 khi có thể.

## Module hoá + SRP

1. `domain/` FSM + policy thuần (test không DB); `server/` use-case; `db`/Prisma; `payments/` adapters; UI chỉ gọi API.
2. Tách Catalog vs Cart vs Checkout vs Payment vs Seller vs Review — không god-service.
3. Phụ thuộc một chiều: UI → application → domain; domain không import Next/Prisma/VNPAY SDK.
4. Fee/commission chỉ đọc từ `commerce-policy` (đánh dấu TBD), snapshot lên order.

## Security by Design

1. Deny by default; object-level authz (buyer/seller/admin).
2. Callback: verify signature + idempotency + replay protection.
3. Validate input (Zod); whitelist field; không tin client `price` / `status` / `role`.
4. Không log secret, full card/bank payload.
5. Rate-limit checkout/pay/listing/report khi Platform hỗ trợ.
6. Fail closed: AuthZ lỗi → 403, không partial write tiền.

Checklist trước merge: *Ai gọi? Object nào? Giá từ đâu? Idempotency? Audit? Adapter nào?*

## Trước khi code

1. Đọc `architecture.md`, `data-model.md`, ADRs.  
2. Xác định PaymentGateway port.  
3. Viết/cập nhật transition table + contract API.  
4. Implement + test theo DoD checklist PFC.

## Cấm

- Microservice Marketplace “cho vui”.
- Sandbox/mock **làm** nền tảng production (Mock chỉ local/dev).
- Payment trong Opportunity Apply.
- Client tự `Published` / `SUCCESS`.
- Hardcode commission rải rác ngoài policy.
- God-file / business logic vendor trong React page.
