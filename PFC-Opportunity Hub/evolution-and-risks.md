# Evolution & Risks — Opportunity Hub

## 1. Bottleneck dự kiến (envelope)

Giả định launch (platform-wide SRS): 100k registered / 10k concurrent — Opportunity là **một phần** traffic.

| Áp lực | Ước lượng thô | Kết luận kiến trúc |
|--------|---------------|-------------------|
| Đọc list/detail | Đọc >> viết (browse nhiều, apply ít) | Tối ưu đọc: index + (sau này) cache |
| Viết apply | Burst khi deadline gần / học bổng hot | Idempotency + rate limit; DB transaction ngắn |
| Verification queue | Tuyến tính theo tin mới | Sampling + auto-check, không full manual |
| Reminder fan-out | Theo số save có deadline trong cửa sổ | Job batch; dedupe |

**Linh hồn có thể bị đè trước:** (1) trust/spam provider, (2) hotspot một opportunity viral, (3) reminder storm.

---

## 2. Lộ trình tiến hóa

| Giai đoạn | Giữ đơn giản | Chỉ thêm khi có tín hiệu |
|-----------|--------------|--------------------------|
| **Launch** | Modular module + PostgreSQL + jobs + shared search/notification | — |
| **Growth** | Read replica / Redis list cache; richer provider analytics | P95 list > SLO; cache hit cần thiết |
| **Scale** | Tách search/indexing; có thể tách worker pool | Queue backlog, job lag |
| **Sau này** | ATS/webhook partners; soft matching (không phải regulated advice) | Partner integration nhu cầu thật |

Không dùng kiến trúc Phase Scale cho Launch.

### Tín hiệu nâng cấp (từ `signals.md`)

- Đọc: CPU DB >70% bền / P99 list xấu → replica hoặc cache.  
- Viết: apply timeout / lock contention trên hotspot row → queue hóa side-effects, giữ transaction mỏng.  
- Reliability: miss reminder / duplicate spam → sửa dedupe + alerting trước khi “đổi architecture”.  
- Tổ chức: nhiều team block nhau trên Opportunity → mới cân microservice.

---

## 3. Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Tin giả / lừa đảo | Tier + sampling + report SLA + takedown audit |
| R2 | External apply mất tracking | Ghi nhận trước redirect; KPI proxy; optional user status |
| R3 | Leak CV | Private storage, signed URL, authz object-level |
| R4 | Race double apply | Unique constraint + idempotency key |
| R5 | Reminder sai giờ/spam | Windows + preference + dedupe table + metrics |
| R6 | Coupling Marketplace/Community | Chỉ link ID qua anti-corruption; không share table |
| R7 | “Verified” bị hiểu là bảo lãnh pháp lý | Copy/disclaimer + Legal sign-off |

## 4. Open questions (cần Product/Legal nếu implement sâu)

1. SLA takedown báo cáo (giờ/ngày)?  
2. Policy chính xác Trusted Partner fast-track?  
3. Một member được bao nhiêu application / opportunity / ngày?  
4. Retention CV sau khi opportunity Expired?  
5. Có cho provider nhắn trực tiếp applicant trong launch không? (mặc định kiến trúc: **chưa** — dùng application status + email qua Notification)

Khi trả lời → tạo ADR mới, không sửa thầm ADR đã Accepted.
