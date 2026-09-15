# PFC Marketplace — Architecture Pack

> Architecture Copilot output · baseline SRS v3.0 Production  
> Module trong **PFC Digital Hub**, không phải sản phẩm độc lập.

## Một câu định vị

**Marketplace** là lớp **trao đổi giá trị (EARN)**: seller đăng listing (sản phẩm vật lý/digital, dịch vụ, course, event/ticket), buyer browse → cart → checkout → thanh toán → theo dõi order/payout — với audit trail và payment abstraction (VNPAY primary).

## Phạm vi Production Launch (P0 trong `web/`)

| Làm | Không làm (hiện tại) |
|-----|----------------------|
| Seller profile + risk-tier verification | KYC toàn bộ user |
| Listing: Physical / Digital / Service (+ Course & Event/Ticket **link ID** stub) | Freelancer marketplace / Opportunity paid placement |
| Lifecycle Listing `Draft → Pending → Published → Unpublished/Archived` | AI ranking / recommendation |
| Cart · Checkout · price snapshot VND · Order FSM | Microservice Marketplace |
| Payment **abstraction** + Mock provider (local) + VNPAY adapter stub | Real VNPAY go-live trước onboarding (#218) |
| Buyer orders · Seller orders · payout **records** (chưa settle thật) | Loyalty / points wallet |
| Review eligibility sau order Completed (BR-008) | Shared Event Engine đầy đủ (chỉ link) |

## Nguồn ràng buộc

- `source/` · SRS v3.0 (FR-MKT-001…009, BR-007/008/012), Screen Inventory (MKT-01…21, SELL-01…17, PAY-01…08 + PAY-A*), Checklist **#169–#219** (Gate 9)
- Strategic Decisions **cuối SRS thắng** mô tả cũ: Q03/Q20 production payment + VNPAY; Q04 seller risk-tier; Q08 project paid → dùng foundation này; Q11 Shared Event

## Tài liệu trong folder

| File | Nội dung |
|------|----------|
| [architecture.md](./architecture.md) | Context / Container, luồng, biên giới, map màn hình |
| [data-model.md](./data-model.md) | Entity, lifecycle, ownership |
| [adrs/](./adrs/) | ADR quyết định then chốt |
| [AGENTS.md](./AGENTS.md) | Guardrail khi Cursor implement |
| [evolution-and-risks.md](./evolution-and-risks.md) | Bottleneck, tín hiệu nâng cấp, rủi ro |
| [TODO.md](./TODO.md) | Todo map checklist #169–#219 |
| [web/](./web/) | Next.js app P0 |

## Giả định đã khóa (để implement)

1. Marketplace là **bounded module** trong modular monolith; schema/prefix `mkt_`; API `/api/…` namespace marketplace.
2. Tiền tệ launch: **VND**. Payment gateway chính: **VNPAY**; local/dev dùng **Mock** qua cùng abstraction.
3. Order phải qua Cart/Checkout/Payment (BR-007). Không sửa lịch sử làm mất audit (BR-012).
4. Course/Event listing **chỉ link** Education / Shared Event bằng ID — không sở hữu content/event CRUD.
5. Fee/commission/refund policy chi tiết vẫn TBD Product/Legal — code dùng **policy config tạm** có đánh dấu TBD, không hardcode magic số rải rác.
