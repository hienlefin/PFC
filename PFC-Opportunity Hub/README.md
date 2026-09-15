# PFC Opportunity Hub — Architecture Pack

> Architecture Copilot output · baseline SRS v3.0 Production  
> Module trong **PFC Digital Hub**, không phải sản phẩm độc lập.

## Một câu định vị

**Opportunity Hub** giúp người trẻ **tìm – lưu – ứng tuyển – theo dõi** các cơ hội (thực tập, việc làm, cuộc thi, học bổng) từ provider đã được kiểm chứng theo tầng, trong khi PFC **không** trở thành bottleneck duyệt tay 100%.

## Phạm vi Production Launch

| Làm | Không làm (hiện tại) |
|-----|----------------------|
| Types: Internship / CTV-Part-time-Full-time / Competition / Scholarship | KYC toàn bộ user |
| Save + Internal Apply + External Apply (track sau redirect) | AI ranking / matching nghề nghiệp |
| Tiered verification: Verified Provider → Verified Opportunity → Trusted Partner | Freelancer marketplace / paid placement phức tạp |
| Deadline + expiry job + reminder (in-app + email + push) | Bank open-banking |
| Browse / search / filter / sort | Microservice riêng cho Opportunity |

## Nguồn ràng buộc

- `sourse/` · SRS v3.0, Screen Inventory (OPP-01…OPP-A08), Checklist tasks 220–245
- Strategic: Q01, Q04–Q06, Q14–Q15, Q18 · BR-005, BR-011 · FR-OPP-001…006

## Tài liệu trong folder

| File | Nội dung |
|------|----------|
| [architecture.md](./architecture.md) | Context / Container, luồng dữ liệu, chất lượng, anti-challenge |
| [data-model.md](./data-model.md) | Entity, lifecycle, ownership |
| [adrs/](./adrs/) | ADR quyết định then chốt |
| [AGENTS.md](./AGENTS.md) | Guardrail khi Cursor implement module này |
| [evolution-and-risks.md](./evolution-and-risks.md) | Bottleneck, tín hiệu nâng cấp, rủi ro |
| [TODO.md](./TODO.md) | Todo triển khai theo OpportunityOS → ScholarTrack → job-board |
| [web/](./web/) | Next.js app Wave P0 (catalog · save · external apply · tracker) |
| [ref-repos/](./ref-repos/) | Clone tham chiếu (shallow) |

## Giả định đã khóa (để implement)

1. Opportunity Hub là **bounded module** trong modular monolith (Platform Core cung cấp Auth/RBAC/Notification/Search/Audit).
2. Apply **không** gắn payment; payment thuộc Marketplace nếu sau này có paid placement.
3. External Apply: ghi `application` **trước** khi mở outbound URL; không phụ thuộc webhook đối tác ở launch.
4. Chỉ opportunity `Verified` (hoặc Trusted Partner) mới public browse mặc định; Draft/Pending chỉ provider/reviewer thấy.
