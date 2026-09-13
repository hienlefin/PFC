# ADR-004 — Reminder & Expiry chạy trên Job Worker, không trên request path

- **Status:** Accepted (FR-OPP-005, BR-011, checklist 232/240)  
- **Date:** 2026-09-11  

- **Context:** Deadline reminder và hết hạn là logic thời gian; đưa vào request Apply/Save sẽ chậm, khó dedupe, dễ spam.

- **Decision:**  
  - `opportunity.expire` và `opportunity.scan` là scheduled jobs.  
  - Dedupe theo `(member_id, opportunity_id, window)`.  
  - Tôn trọng notification preference; kênh In-app + Email + Push (Q14).  
  - Deep link về OPP-05 / OPP-16.

- **Consequences:**  
  + Request path mỏng; có thể replay job.  
  − Reminder có độ trễ theo chu kỳ job (phút–giờ) — chấp nhận được với deadline ngày.
