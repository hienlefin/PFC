# ADR-003 — Listing / Order / Payment state machines server-side

- **Status:** Accepted (BR-007, BR-012, SRS §9)  
- **Date:** 2026-09-15  

- **Context:** Commerce chết vì nhảy trạng thái tùy ý và mất audit.

- **Decision:**  
  1. Listing: `Draft → Pending → Published → Unpublished → Archived`.  
  2. Cart là entity riêng; Order tạo ở Checkout với status bắt đầu `PENDING_PAYMENT`.  
  3. Order: `PENDING_PAYMENT → PAID → PROCESSING → COMPLETED` (+ `CANCELLED` / `REFUNDED`).  
  4. Payment: `INITIATED → PENDING → SUCCESS|FAILED|CANCELLED|REFUNDED`.  
  5. Mọi transition qua hàm domain `assertTransition` + ghi audit/event; client chỉ gửi intent.

- **Consequences:**  
  + Test được không DB; audit rõ.  
  − Refund/cancel chi tiết chờ Product — chỉ giữ state, policy hẹp ở P0.
