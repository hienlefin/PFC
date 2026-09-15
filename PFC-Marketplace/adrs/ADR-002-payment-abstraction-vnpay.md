# ADR-002 — Payment abstraction; VNPAY primary; Mock local

- **Status:** Accepted (SRS Q03 / Q20 cuối tài liệu)  
- **Date:** 2026-09-15  

- **Context:** SRS cuối yêu cầu production payment từ launch, VNPAY primary, abstraction cho gateway thứ hai. Môi trường dev/cloud thường chưa có merchant credentials.

- **Decision:**  
  1. Định nghĩa port `PaymentGateway` (`createPayment`, `parseCallback`, `queryStatus`).  
  2. Adapter **VNPAY** là primary production.  
  3. Adapter **Mock** cho local/demo — cùng FSM/idempotency; không coi Mock là nền tảng vận hành thật.  
  4. UI/PAY screens chỉ nói chuyện với orchestrator, không import vendor SDK.

- **Anti-pattern tránh:** Logic VNPAY trong React; sandbox làm production ledger; timeout callback → tự ý mark FAILED không query.

- **Consequences:**  
  + Đổi gateway / test local không đụng UI.  
  − Go-live thật vẫn cần #218–#219 (onboarding + E2E VNPAY).
