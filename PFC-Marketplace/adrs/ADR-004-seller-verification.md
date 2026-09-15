# ADR-004 — Seller risk-based verification (không KYC toàn user)

- **Status:** Accepted (SRS Q04)  
- **Date:** 2026-09-15  

- **Context:** Trust seller cần thiết cho payout; KYC 100% user không phù hợp community platform.

- **Decision:**  
  1. Tier: `UNVERIFIED | VERIFIED | TRUSTED`.  
  2. Seller muốn nhận payout phải cung cấp định danh + tài khoản nhận tiền theo yêu cầu pháp luật/provider (`payout_eligible`).  
  3. Listing mới của seller rủi ro cao đi `Pending` trước `Published`.  
  4. Mọi đổi tier / approve listing ghi audit.

- **Consequences:**  
  + Giảm ma sát member thường.  
  − Residual fraud → cần report/moderation (#212–#213).
