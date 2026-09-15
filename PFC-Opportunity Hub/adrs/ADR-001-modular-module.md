# ADR-001 — Opportunity Hub là bounded module trong Modular Monolith

- **Status:** Accepted  
- **Date:** 2026-09-11  
- **Context:** PFC Digital Hub có 6 domain; baseline scale 100k members / 10k concurrent; team chưa có tín hiệu “đa team block nhau” trên Opportunity. Template `standard-web-app`: microservice giải quyết tổ chức, không phải “cho hiện đại”.

- **Decision:** Implement Opportunity Hub như **module biên giới rõ** trong một (hoặc vài) deployable monolith; API riêng namespace `/api/v1/opportunities/*`; DB schema/prefix `opp_`; phụ thuộc Platform Core qua interface, không import nội bộ module khác.

- **Alternatives:**  
  - A) Microservice Opportunity ngay → nhận phân tán, deploy, authz distributed sớm.  
  - B) Nhúng lung tung vào Community → mất ownership, khó audit verification.

- **Consequences:**  
  + Đơn giản vận hành, transaction local cho Apply/Save.  
  − Sau này tách service cần cắt DB + event; giữ interface sạch để giảm nợ.

- **Upgrade signal:** nhiều team đụng cùng repo Opportunity, hoặc scale write/read vượt capacity đã đo (xem `evolution-and-risks.md`).
