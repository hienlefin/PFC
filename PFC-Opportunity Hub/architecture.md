# Opportunity Hub — Architecture

## 1. Chất lượng & thứ tự ưu tiên (Production Launch)

| Thuộc tính | Mục tiêu | Sẵn sàng hy sinh |
|------------|----------|------------------|
| **Tin cậy / Trust** | Verification tier + audit + report/takedown | Tốc độ publish tức thì |
| **Đúng quyền** | Object-level auth (owner / provider / reviewer / member) | Convenience “admin bypass” ở client |
| **Khả dụng** | Browse/Apply không chết theo moderation queue | Real-time status từ employer ngoài |
| **Hiệu năng đọc** | List/detail P95 chấp nhận được ở baseline 100k members | Personalization AI |
| **Nhất quán** | Lifecycle Opportunity/Application không nhảy trạng thái tùy ý | Strong consistency xuyên module khác |
| **Chi phí** | Modular monolith + job scheduler | Microservice / event bus phức tạp sớm |

**Xung đột đã chọn:** Trust > tốc độ đăng tin; Audit trail > chỉnh sửa lịch sử tự do; Track external apply tốt nhất có thể > phụ thuộc API đối tác.

---

## 2. Context (C4 L1)

```
                    ┌─────────────────────────┐
                    │   Member (PFC User)     │
                    │  browse / save / apply  │
                    └───────────┬─────────────┘
                                │
┌──────────────┐    ┌───────────▼─────────────┐    ┌──────────────────┐
│ Opportunity  │    │   PFC Digital Hub       │    │  Reviewer / Admin│
│ Provider     │───▶│   (Web / Member App)    │◀───│  verify / sample │
│ create/edit  │    └───────────┬─────────────┘    └──────────────────┘
└──────────────┘                │
                     ┌──────────▼──────────┐
                     │  Opportunity Hub    │
                     │  (bounded module)   │
                     └──────────┬──────────┘
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
   ┌───────────────┐   ┌────────────────┐   ┌─────────────────┐
   │ Platform Core │   │ Notification   │   │ External career │
   │ Auth / RBAC   │   │ (reminders)    │   │ sites (URL only)│
   │ Member ID     │   │ Search index   │   │ no webhook req. │
   │ Audit / Jobs  │   └────────────────┘   └─────────────────┘
   └───────────────┘
```

---

## 3. Container (C4 L2) — trong Modular Monolith

```
┌──────────────────────── PFC Application (stateless) ────────────────────────┐
│                                                                              │
│  Presentation: Public Web · Member App · Provider Center · Admin Portal      │
│                              │                                               │
│                    API Gateway / BFF (REST, versioned)                       │
│                              │                                               │
│  ┌───────────────────────────▼────────────────────────────┐                  │
│  │              Opportunity Module                        │                  │
│  │  CatalogService │ ApplicationService │ VerificationSvc │                  │
│  │  ReminderPolicy │ ProviderProfileSvc │ ReportService   │                  │
│  └───────┬───────────────┬────────────────┬───────────────┘                  │
│          │               │                │                                  │
│  Shared: AuthZ · Idempotency · Audit · Outbox/Events(local) · File Storage   │
└──────────┼───────────────┼────────────────┼──────────────────────────────────┘
           ▼               ▼                ▼
     ┌──────────┐   ┌────────────┐   ┌─────────────────┐
     │PostgreSQL│   │ Redis      │   │ Job Worker      │
     │(source of│   │(optional   │   │ expiry · remind │
     │ truth)   │   │ list cache)│   │ sampling queue  │
     └──────────┘   └────────────┘   └─────────────────┘
```

**Quyết định khung (xem ADR-001):** module biên giới rõ trong **một deployable**; không tách microservice Opportunity cho đến khi có tín hiệu tổ chức/scale thật.

---

## 4. Luồng dữ liệu chính

### 4.1 Publish & verify

```
Provider ─create─▶ Opportunity(Draft)
       ─submit─▶ Pending
Admin/Reviewer (+ auto checks / sampling)
       ├─▶ Verified  ──▶ public index / search
       ├─▶ Rejected  ──▶ provider notified + audit
Trusted Partner path: giảm ma sát review (policy table), vẫn audit.
Expiry job: deadline/expiry_at passed ─▶ Expired (rời public feed).
```

### 4.2 Member Save / Apply

```
Member ─browse Verified─▶ Detail
  ├─ Save ─▶ saved_opportunity (unique member+opp)
  ├─ Internal Apply ─▶ application(status=submitted)
  │                    + attachments (CV) via Storage
  │                    + history row + notify provider
  └─ External Apply ─▶ application(status=redirected, outbound_url)
                       THEN open external URL
                       (tracking = best-effort; không chờ webhook)
```

### 4.3 Deadline reminder

```
Scheduler (hourly/daily)
  find saved|applied where deadline in windows [T-7,T-3,T-1,T0]
  ∩ reminder preference ON
  ∩ not already sent for window
  ─▶ Notification Core (in-app + email + push)
  deep link → OPP-05 / OPP-16
```

Reminder **không** chạy trong request path Apply (tránh chậm + trùng).

---

## 5. Biên giới module (ownership)

| Sở hữu Opportunity Hub | Thuê / gọi Platform Core |
|------------------------|---------------------------|
| Opportunity, ProviderProfile (opp-scoped), Application, Save, VerificationDecision, Report | Member identity, AuthN/Z, RBAC roles |
| Lifecycle & business rules BR-005/011 | Notification delivery |
| Opp search documents / filters | Shared Search indexing API |
| Provider risk tier (opp domain) | Audit log sink, file storage, job framework |

**Cấm:** UI Opportunity gọi thẳng DB module khác; client tự set `verification_status`; sửa history application.

---

## 6. Bảo mật tối thiểu

- Mọi API: authenticate + **object-level** authorize (provider chỉ sửa opp của mình; member chỉ xem application của mình).
- Public list chỉ `Verified|Trusted` + not expired.
- Attachment CV: private object storage, signed URL ngắn hạn.
- Report/takedown: audit bắt buộc; reviewer action có reason code.
- Rate-limit: create opportunity, apply, report.
- Idempotency key trên Apply (tránh double-submit).

---

## 7. Map màn hình → capability

| Screens | Capability |
|---------|------------|
| OPP-01…05, 06–09 | Catalog + typed detail |
| OPP-10…11 | Save |
| OPP-12…16 | Apply internal/external + my applications |
| OPP-17 | Reminder UX (delivery = Notification) |
| OPP-18, OPP-A01…A03 | Provider |
| OPP-A04…A07 | Verification |
| OPP-A08 | Expiry ops |

---

## 8. Anti-challenge (chết ở đâu?)

1. **Trust sụp** nếu verification chỉ là badge UI → bắt buộc state machine + audit + report.
2. **External apply “mất dấu”** → chấp nhận best-effort; KPI follow-through dùng proxy (click-out + voluntary status update), không giả vờ có webhook.
3. **Reminder spam / miss** → window + preference + dedupe table; đo delivery failure.
4. **Hot listing đọc** (học bổng lớn) → cache list/detail khi P95 xấu; đừng cache sớm.
5. **Provider spam** → risk tier + rate limit + sampling queue, không duyệt tay 100%.
