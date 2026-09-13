# ADR-003 — Internal Apply + External Apply (track trước redirect)

- **Status:** Accepted (SRS Q06, FR-OPP-004)  
- **Date:** 2026-09-11  

- **Context:** Nhiều cơ hội nằm ngoài PFC (career site). Cần hỗ trợ Apply mà không phụ thuộc tích hợp API nhà tuyển dụng ở launch.

- **Decision:**  
  - **Internal:** form + CV upload + application record + status history trong PFC.  
  - **External:** tạo application `redirected` **trước** khi mở `external_url`; lưu `outbound_clicked_at`; deep link My Applications vẫn theo dõi được.  
  - Không bắt buộc webhook đối tác ở Production Launch.  
  - Idempotency key trên POST apply.

- **Alternatives:** Chỉ deep-link không ghi nhận → mất KPI Save/Apply follow-through. Bắt buộc ATS integration → chậm launch.

- **Consequences:**  
  + Launch được, KPI proxy đo được.  
  − Trạng thái “đã nộp bên ngoài” là best-effort (user tự cập nhật hoặc để `redirected`).
