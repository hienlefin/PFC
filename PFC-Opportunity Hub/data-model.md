# Opportunity Hub — Data Model

## 1. ER logic (ASCII)

```
Member (Platform)                ProviderProfile
     │  member_id                     │  provider_id
     │                                │  member_id (owner account)
     │                                │  verification_tier
     │                                │  status
     │                                │
     │         ┌──────────────────────┘
     │         ▼
     │   Opportunity
     │     opportunity_id
     │     provider_id
     │     type
     │     title, description, ...
     │     location / mode
     │     deadline_at, expire_at
     │     apply_mode (internal|external|both)
     │     external_url?
     │     status (lifecycle)
     │     visibility
     │
     ├──────────── Save ─────────────┐
     │   saved_opportunity           │
     │   (member_id, opportunity_id) │
     │   created_at                  │
     │                               │
     └──────── Application ──────────┘
           application_id
           member_id, opportunity_id
           channel (internal|external)
           status
           payload (CV refs, cover letter)
           outbound_clicked_at?
```

```
Opportunity ──< VerificationDecision
                 decision_id, actor_id, from→to, reason, created_at

Opportunity ──< OpportunityReport
                 report_id, reporter_id, reason, status, resolution

ProviderProfile ── verification_tier history (audit via decisions)
```

---

## 2. Enums / lifecycle

### Opportunity.status (BR-005)

```
Draft → Pending → Verified → Expired
              ↘ Rejected
Verified → (takedown) → Rejected/Unpublished  [moderation]
```

Chỉ worker/system hoặc transition table mới được đổi status; client gửi intent (`submit`, `withdraw`), server áp rule.

### Provider.verification_tier (Q05)

| Tier | Ý nghĩa | Hệ quả catalog |
|------|---------|----------------|
| Unverified | Mới | Chỉ Draft nội bộ; submit vào queue |
| Verified Provider | Định danh org đủ điều kiện | Publish vào Pending/Verified theo policy |
| Trusted Partner | Đối tác tin cậy | Fast-track / sampling thấp hơn |

### Application.status (gợi ý launch)

```
draft → submitted → under_review → accepted | rejected | withdrawn
external: redirected → (optional) user_marked_submitted | closed
```

External không bắt buộc đồng bộ trạng thái nhà tuyển dụng.

### Opportunity.type (FR-OPP-001)

`internship | job | competition | scholarship`  
(job bao gồm CTV / part-time / full-time qua `employment_type`)

---

## 3. Trường tối thiểu Opportunity

| Field | Ghi chú |
|-------|---------|
| opportunity_id | UUID |
| provider_id | FK |
| type + employment_type? | |
| title, summary, description | |
| requirements, benefits | text/structured JSON có version |
| location_text, work_mode | onsite/remote/hybrid |
| deadline_at, expire_at | expire job dùng expire_at |
| apply_mode | internal / external / both |
| external_url | bắt buộc nếu external/both |
| status | lifecycle |
| published_at | |
| search_document_version | phục vụ reindex |

---

## 4. Indexes gợi ý (PostgreSQL)

- `(status, deadline_at)` — public feed + expiry
- `(provider_id, status)` — provider console
- `(type, status, published_at DESC)` — filter
- UNIQUE `(member_id, opportunity_id)` trên saves
- UNIQUE partial: một application active / member / opportunity (theo policy)
- Verification queue: `(status=Pending, submitted_at)`

Full-text: dùng shared Search (hoặc `tsvector` trong module nếu Search chưa sẵn) — Q15: keyword + filter + sort, chưa AI rank.

---

## 5. Jobs

| Job | Input | Output |
|-----|-------|--------|
| `opportunity.expire` | expire_at <= now, status=Verified | → Expired + deindex |
| `opportunity.scan` | saves/applications + windows | notification commands |
| `verification.sample` | Trusted/Verified volume | queue reviewer items |
| `search.reindex` | opportunity changed | upsert search doc |

---

## 6. Event nội bộ (optional outbox)

Phát hành trong process/outbox, **không** yêu cầu broker bên ngoài lúc launch:

- `opportunity.verified`
- `opportunity.expired`
- `application.submitted`
- `application.external_redirected`
- `provider.tier_changed`

Consumer: Search indexer, Notification, Analytics.
