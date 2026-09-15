# Marketplace — Architecture

## 1. Chất lượng & thứ tự ưu tiên (Production Launch)

| Thuộc tính | Mục tiêu | Sẵn sàng hy sinh |
|------------|----------|------------------|
| **Integrity tiền** | Không nhân đôi order/payment; webhook idempotent; audit bất biến | UX “một click xong” bỏ qua state |
| **Đúng quyền** | Object-level: buyer/seller/admin trên order & listing | Admin bypass ở client |
| **Tin cậy seller** | Risk-tier + listing Pending trước Published | Publish tức thì không review |
| **Khả dụng checkout** | Fail payment → retry; không mất cart hợp lệ | Multi-gateway phức tạp sớm |
| **Chi phí** | Modular monolith + job đối soát | Microservice / event bus sớm |

**Xung đột đã chọn (SRS cuối):** Trust & payment integrity > tốc độ đăng bán; Production payment abstraction ngay > sandbox-as-platform.

---

## 2. Context (C4 L1)

```
     Buyer                    Seller                   Admin/Reviewer
  browse/cart/pay         listing/orders/payout      verify/moderate
       │                        │                           │
       └────────────┬───────────┴───────────┬───────────────┘
                    ▼                       ▼
            ┌───────────────────────────────────┐
            │        PFC Digital Hub            │
            │         (Web / Member App)        │
            └─────────────────┬─────────────────┘
                              ▼
            ┌───────────────────────────────────┐
            │     Marketplace (bounded module)  │
            │  Catalog · Cart · Order · Payment │
            │  Seller · Review · Payout records │
            └─────────────────┬─────────────────┘
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  Platform Core         Payment Provider      Shared Event /
  Auth·RBAC·Audit       (VNPAY primary;       Education (ID link)
  Notification·Jobs     Mock local)
```

---

## 3. Container (C4 L2) — Modular Monolith

```
┌──────────────────── PFC Application ────────────────────┐
│  Presentation: Buyer · Seller Center · Admin            │
│                      │                                  │
│                 BFF / REST                              │
│                      │                                  │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │              Marketplace Module                  │   │
│  │  CatalogSvc │ CartSvc │ CheckoutSvc │ OrderSvc   │   │
│  │  PaymentOrchestrator │ SellerSvc │ ReviewSvc     │   │
│  │  PayoutLedger (records) │ Report/Moderation      │   │
│  └──────────┬─────────────┬────────────┬────────────┘   │
│    domain/ FSM+policy   ports/ PaymentGateway           │
│    audit · idempotency  Mock | VnPay adapters           │
└─────────────┼─────────────┼─────────────────────────────┘
              ▼             ▼
         PostgreSQL    Job Worker (reconcile / payout eligibility)
         (SQLite local)
```

**ADR-001:** không tách microservice Marketplace đến khi có tín hiệu tổ chức/scale.

---

## 4. Luồng dữ liệu chính

### 4.1 Seller publish listing

```
Seller ─create─▶ Listing(Draft)
     ─submit─▶ Pending
Reviewer/Admin (+ auto checks)
     ├─▶ Published  ──▶ public catalog
     ├─▶ (reject) back Draft / Unpublished + audit
Seller ─unpublish─▶ Unpublished → có thể Archive
```

### 4.2 Buy (UC-14 Checkout & Pay)

```
Buyer ─add─▶ CartItem (validate listing Published + qty)
   ─checkout─▶ create Order(PENDING_PAYMENT) + OrderItems (price snapshot)
               + Payment(INITIATED)
   ─initiate─▶ PaymentGateway.createPayment → PENDING
   ◀─callback/return─ verify signature + idempotency key
               ├─ Success → Payment SUCCESS, Order PAID → PROCESSING
               └─ Failed  → Payment FAILED, Order stays PENDING_PAYMENT (retry)
```

### 4.3 Sau thanh toán

```
Seller fulfills ─▶ Order COMPLETED (digital auto-complete policy TBD)
Buyer đủ điều kiện ─▶ Review (BR-008)
Payout job ─▶ PayoutRecord (gross/net/commission) khi seller eligible
Reconcile job ─▶ so khớp provider vs sổ nội bộ
```

---

## 5. Biên giới module (ownership)

| Sở hữu Marketplace | Thuê / gọi ngoài |
|--------------------|------------------|
| SellerProfile, Listing, Cart, Order, Payment, PayoutRecord, Review, Report | Member identity, AuthN/Z, RBAC |
| Listing/Order/Payment FSM + commission policy config | Notification delivery |
| PaymentGateway port + adapters | Shared Event / Education **chỉ ID** |
| Catalog search docs (module hoặc Search API) | Audit sink, Jobs framework |

**Cấm:** tin client về price/stock/status; sửa payment history in-place; Opportunity Apply gắn payment; Club tự implement VNPAY; share bảng với module khác.

---

## 6. Bảo mật tối thiểu

- Deny by default; object-level authz trên order/listing/seller.
- Payment callback: verify signature, idempotent, replay-safe.
- Không log full financial payload / secrets.
- Rate-limit: checkout, pay, listing create, report.
- Public catalog chỉ `Published`.
- Idempotency-Key trên checkout/pay/callback.

---

## 7. Map màn hình → capability

| Screens | Capability |
|---------|------------|
| MKT-01…04 | Catalog browse / category / search |
| MKT-05…08 | Detail theo type (+ course/event link) |
| MKT-09…10 | Seller profile / store |
| MKT-11…15 | Cart · Checkout · Payment · Result · Confirmation |
| MKT-16…17 | My orders / detail |
| MKT-18…19 | Review |
| MKT-20…21 | Refund request/status |
| SELL-01…17 | Seller center |
| PAY-01…08, PAY-A* | Payment UX + admin |

---

## 8. Anti-challenge

1. **Double charge / double order** → unique constraints + idempotency + FSM.
2. **Tin client price** → snapshot server-side lúc checkout từ listing Published.
3. **VNPAY chưa onboard** → Mock adapter cùng port; không nhét vendor logic vào UI.
4. **Fee policy chưa chốt** → `commerce-policy.ts` một chỗ, gắn nhãn TBD.
5. **Event/Course ownership creep** → chỉ lưu `externalRefType` + `externalRefId`.
