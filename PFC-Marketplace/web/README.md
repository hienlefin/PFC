# PFC Marketplace — Web (Wave P0)

Next.js 15 app từ architecture pack `PFC-Marketplace/`. Payment qua abstraction; local dùng **Mock**, VNPAY khi có credentials.

## Run

```bash
cd "PFC-Marketplace/web"
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev -- -p 43211
```

Open http://localhost:43211/login

| Role | Email | Password | Quyền chính |
|------|-------|----------|-------------|
| Buyer | buyer@pfc.vn | Buyer-PFC-2026 | Mua hàng, giỏ, đơn |
| Seller | seller@pfc.vn | Seller-PFC-2026 | + Thêm sản phẩm, Seller Center |
| **Chủ nhiệm CLB** | chunhiem@pfc.vn | ChuNhiem-PFC-2026 | Duyệt listing + **Phân quyền** |
| **Trưởng CLB** | truong@pfc.vn | Truong-PFC-2026 | Duyệt listing + **Phân quyền** |

RBAC: `src/domain/permissions.ts` — deny by default. **Chỉ Chủ nhiệm và Trưởng câu lạc bộ** vào `/permissions` để đổi role.

`PAYMENT_PROVIDER=MOCK` (mặc định). Đặt `VNPAY` chỉ khi đã có `VNPAY_TMN_CODE` + `VNPAY_HASH_SECRET`.

## P0 routes

| Path | Screen |
|------|--------|
| `/` | MKT-01 catalog |
| `/listings/[id]` | MKT-05 detail + add cart |
| `/cart` | MKT-11 |
| `/orders`, `/orders/[id]` | MKT-16/17 + pay |
| `/pay/result` | MKT-14 callback |
| `/seller`, `/seller/new` | SELL-01/05 |
| `/admin` | listing Pending queue |

## Tests

```bash
npm test
```
