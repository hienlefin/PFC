# ADR-002 — Verification theo tầng + sampling (không duyệt tay 100%)

- **Status:** Accepted (SRS Q05)  
- **Date:** 2026-09-11  

- **Context:** Trust là chất lượng sống còn của Opportunity Hub, nhưng PFC không scale nếu mọi tin phải reviewer duyệt thủ công.

- **Decision:**  
  1. Ba tầng: **Verified Provider** / **Verified Opportunity** / **Trusted Partner**.  
  2. Automated checks (field đầy đủ, URL allowlist/blocklist, spam rate, duplicate detect) trước khi vào queue.  
  3. **Sampling** + report/takedown cho Trusted Partner; full review cho provider mới / risk cao.  
  4. Mọi quyết định ghi `VerificationDecision` + audit.

- **Anti-pattern tránh:** Badge “Verified” chỉ là boolean trên UI; publish Draft ra public.

- **Consequences:**  
  + Throughput đăng tin cao hơn, vẫn có đường báo cáo.  
  − Có residual risk tin xấu lọt; cần SLA takedown và metric trust/safety.
