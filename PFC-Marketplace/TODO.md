# Marketplace — Implementation TODO

Baseline: SRS checklist **#169–#219** · App: `web/` · Gate **9**

| Wave | Scope | Status |
|------|--------|--------|
| P0 Foundation | Seller · Listing FSM · Catalog · Cart · Checkout · Payment port (Mock) · Orders · Audit | Done (`web/`) |
| P1 Commerce harden | VNPAY adapter live · reconcile job · payout eligibility · refund UX · review | Pending credentials / policy |
| P2 Cross-link | Course↔Education · Event/Ticket↔Shared Event · moderation queues · load tests | Pending sibling modules |

## Checklist map (P0 target)

- [x] #169 Seller profile/domain
- [x] #170–#171 Risk tier + status (minimal evidence fields)
- [ ] #172 Onboarding checklist UX đầy đủ
- [x] #173–#176 Listing abstraction + Physical/Digital/Service
- [ ] #177–#178 Course/Event listing link (stub fields only in P0)
- [x] #179 Listing lifecycle
- [x] #180 Price VND
- [x] #181–#183 Inventory / delivery / service meta (minimal JSON/fields)
- [x] #184–#185 Catalog browse + filter type
- [x] #186–#189 Cart · items · qty · price snapshot
- [x] #190–#192 Checkout · order create · lifecycle core
- [ ] #193 Cancel/refund theo policy đã duyệt (states only)
- [x] #194–#196 Order history buyer/seller
- [x] #198 Payment abstraction
- [x] #200–#203/#206 Initiate + callback path + idempotency (Mock)
- [ ] #199/#218/#219 VNPAY production
- [x] #207–#209 Payout **records** (không settle bank)
- [ ] #210–#217 Fraud, monitoring, alerts production
- [x] #211 Review after COMPLETED (minimal)

## TBD trước go-live thật

- Fee/commission/refund/tax/invoice policy (Decision Gate)
- VNPAY merchant onboarding + certification
- Shared Event module sẵn sàng cho ticket SKU

## Run

```bash
cd "PFC-Marketplace/web"
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev -- -p 43211
```

| Role | Email | Password |
|------|-------|----------|
| Buyer | buyer@pfc.vn | Buyer-PFC-2026 |
| Seller | seller@pfc.vn | Seller-PFC-2026 |
| Admin | admin@pfc.vn | Admin-PFC-2026 |
