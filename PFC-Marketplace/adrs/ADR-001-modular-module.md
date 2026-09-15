# ADR-001 — Marketplace là bounded module trong Modular Monolith

- **Status:** Accepted  
- **Date:** 2026-09-15  
- **Context:** PFC có 6 domain; Marketplace cần integrity giao dịch cao nhưng team chưa có tín hiệu tách service. Template ecommerce: microservice giải quyết tổ chức, không phải “cho hiện đại”.

- **Decision:** Implement Marketplace như **module biên giới rõ** trong modular monolith; models/prefix `Mkt*` / `mkt_`; API marketplace; phụ thuộc Platform qua interface; không import nội bộ Opportunity/Finance/Community.

- **Alternatives:**  
  - A) Microservice commerce ngay → phân tán, saga phân tán sớm.  
  - B) Nhúng vào Club/Community → mất ownership tiền và audit.

- **Consequences:**  
  + Transaction local cho cart/order/payment.  
  − Tách service sau cần cắt DB; giữ port Payment sạch.
