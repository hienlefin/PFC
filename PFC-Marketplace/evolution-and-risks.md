# Evolution & Risks — Marketplace

## 1. Bottleneck dự kiến

| Áp lực | Kết luận |
|--------|----------|
| Đọc catalog | Index + (sau) cache list; đừng cache sớm |
| Checkout/pay burst | Idempotency + short transactions; không giữ lock chờ redirect VNPAY |
| Callback trùng | Unique provider_ref + idempotency table |
| Inventory physical | Optimistic / conditional update; hotspot → queue sau |
| Payout/reconcile | Batch jobs; không trong request path |

**Linh hồn dễ bị đè:** (1) sai lệch sổ vs VNPAY, (2) seller gian lận, (3) double pay khi retry.

---

## 2. Lộ trình tiến hóa

| Giai đoạn | Giữ đơn giản | Chỉ thêm khi có tín hiệu |
|-----------|--------------|--------------------------|
| **Launch** | Module + Mock/VNPAY adapter + FSM + audit | — |
| **Growth** | Real VNPAY cert, richer seller tools, reconcile dashboards | Onboarding #218–#219 xong |
| **Scale** | Read replica, payment worker pool, inventory segmentation | P95/checkout errors, hotspot SKU |
| **Sau này** | Gateway #2, advanced fraud, multi-currency | Product quyết định |

### Tín hiệu nâng cấp

- Payment unknown/fail spike → cải thiện reconcile trước khi đổi kiến trúc.
- Catalog P99 xấu → cache/search tách.
- Nhiều team block Marketplace repo → mới cân tách service.

---

## 3. Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Double charge / duplicate order | Idempotency keys + unique constraints + FSM |
| R2 | Price tampering | Server snapshot; ignore client price |
| R3 | Seller fraud / hàng giả | Risk-tier + listing Pending + report |
| R4 | VNPAY chưa ready | Mock local; block go-live tới #218/#219 |
| R5 | Fee/tax policy đổi | Policy version + snapshot trên order |
| R6 | Coupling Event/Education | Chỉ external ref ID |
| R7 | Coupling Opportunity/Club | Không share table; Club không tự VNPAY |
| R8 | Refund mơ hồ | States có sẵn; chi tiết policy TBD → ADR khi Product chốt |

## 4. Open questions (Product/Legal/Finance)

1. Công thức commission / ai chịu phí / hoàn hủy chi tiết?
2. Thuế/hóa đơn: platform vs seller model?
3. Digital goods: auto-complete ngay khi Paid?
4. SLA payout (T+N)?
5. Inventory oversell policy khi concurrent?

Khi trả lời → ADR mới; không sửa thầm ADR Accepted.
