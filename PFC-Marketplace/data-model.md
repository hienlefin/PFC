# Marketplace — Data Model

## 1. ER logic (ASCII)

```
Member (Platform)                 SellerProfile
  member_id                         seller_id
                                    member_id (owner)
                                    verification_tier
                                    status, payout_eligible
         │                                │
         │         ┌──────────────────────┘
         │         ▼
         │      Listing
         │        listing_id, seller_id
         │        type (PHYSICAL|DIGITAL|SERVICE|COURSE|EVENT_TICKET)
         │        title, description, price_vnd, currency=VND
         │        inventory?, delivery_meta?, service_meta?
         │        external_ref_type/id? (Education|SharedEvent)
         │        status (lifecycle)
         │
         ├──── Cart ──── CartItem(listing_id, qty)
         │
         └──── Order ─── OrderItem (listing snapshot: title, unit_price, qty)
                │         status, buyer_id, seller_id?, total_vnd
                │         idempotency_key
                ├── Payment (provider, status, provider_ref, amounts)
                ├── PayoutRecord (gross, commission, net, status)
                └── Review (rating, body) — only if eligible
```

Prefix bảng Prisma/SQL: `Mkt*` / cột logic thuộc schema marketplace (`mkt_` nếu Postgres schema tách).

---

## 2. Enums / lifecycle

### Listing.status (SRS Product/Service)

```
Draft → Pending → Published → Unpublished → Archived
              ↘ (reject) → Draft   [moderation]
Published → Unpublished (seller hoặc admin)
```

Public catalog: **chỉ Published**.

### Order.status (BR-007)

```
PENDING_PAYMENT → PAID → PROCESSING → COMPLETED
       │              ↘ CANCELLED
       │         PAID/PROCESSING → REFUNDED (policy TBD)
       └─ (abandon/timeout job) → CANCELLED
```

SRS ghi `Cart → Checkout → …`; **Cart là entity riêng**, không phải status của Order. Order được tạo ở bước Checkout.

### Payment.status

```
INITIATED → PENDING → SUCCESS | FAILED | CANCELLED | REFUNDED
```

### Seller.verification_tier (Q04)

| Tier | Ý nghĩa | Hệ quả |
|------|---------|--------|
| UNVERIFIED | Mới đăng ký | Có thể Draft; submit → Pending |
| VERIFIED | Đủ định danh theo risk | Publish path bình thường |
| TRUSTED | Đối tác tin cậy | Sampling thấp hơn (policy) |

Seller nhận payout: cần đủ thông tin nhận tiền + `payout_eligible` (Q04).

### Listing.type (FR-MKT-001…004)

`PHYSICAL | DIGITAL | SERVICE | COURSE | EVENT_TICKET`

COURSE / EVENT_TICKET bắt buộc có `externalRef*` khi liên kết module khác.

---

## 3. Trường tối thiểu

### Listing

| Field | Ghi chú |
|-------|---------|
| listing_id | cuid |
| seller_id | FK |
| type | enum |
| title, summary, description | |
| price_vnd | integer VND (đồng) |
| currency | luôn `VND` launch |
| inventory_qty | physical; null = unlimited/digital |
| status | lifecycle |
| published_at | |

### Cart / CartItem

- Một cart active / member (`status=OPEN`).
- CartItem: `listing_id`, `quantity`; validate listing Published + inventory.

### Order / OrderItem

- `idempotency_key` unique (checkout).
- OrderItem **snapshot** `title`, `unit_price_vnd`, `listing_id`, `quantity` — không đọc lại giá listing sau pay.
- `total_vnd`, `commission_bps_applied` (từ policy tại thời điểm tạo).

### Payment

- `provider` (`MOCK` | `VNPAY`)
- `provider_ref`, `idempotency_key` unique
- `amount_vnd`, status, raw callback ref (không log plaintext nhạy cảm)

### PayoutRecord

- `gross_vnd`, `commission_vnd`, `net_vnd`, `status` (`PENDING|ELIGIBLE|PAID|BLOCKED`)
- Tạo sau Payment SUCCESS; settle thật sau onboarding.

---

## 4. Indexes gợi ý

- `(status, published_at DESC)` — catalog
- `(seller_id, status)` — seller console
- `(type, status)` — filter
- UNIQUE cart open per member
- UNIQUE `(member_id)` partial open cart — SQLite: enforce in app + unique on `buyerId` where open nếu hỗ trợ
- UNIQUE payment `idempotency_key`, `provider_ref` (khi có)
- Order `(buyer_id, created_at)`, `(seller_id, status)`

---

## 5. Jobs

| Job | Input | Output |
|-----|-------|--------|
| `payment.reconcile` | PENDING quá hạn | query provider / mark FAILED hoặc SUCCESS |
| `order.expire_unpaid` | PENDING_PAYMENT timeout | → CANCELLED + restore inventory |
| `payout.scan` | Paid orders chưa payout | tạo/cập nhật PayoutRecord |
| `search.reindex` | listing changed | upsert search doc |

---

## 6. Policy tạm (TBD Product)

File code: `domain/commerce-policy.ts`

| Key | Launch default (TBD) |
|-----|----------------------|
| `commission_bps` | 500 (5%) |
| `unpaid_timeout_minutes` | 30 |
| `review_after` | Order COMPLETED |
| `currency` | VND |

Đổi policy → ADR mới hoặc cập nhật có version; snapshot `commission_bps` trên Order.

---

## 7. Event nội bộ (outbox optional)

- `listing.published` / `listing.unpublished`
- `order.paid` / `order.completed` / `order.cancelled`
- `payment.succeeded` / `payment.failed`
- `payout.recorded`

Consumer: Notification, Search, Analytics — không broker ngoài lúc launch.
