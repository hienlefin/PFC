# Data classification & retention (Club) — P1.8

Baseline: ADR-003. Legal may extend; Club code must not shorten without a new ADR.

| Data | Class | Retention |
|------|--------|-----------|
| Membership PII (name, email, position, history) | confidential | 24 months after `left` / `alumni` / club disband (launch: disband API blocked) |
| Internal documents | confidential | 24 months after `deletedAt` (soft-delete), then purge job |
| Audit events | internal | retain ≥ membership/doc retention for evidence |
| Task titles / activity titles | internal | life of club + 24 months after archive |

Constants: `src/domain/data-class.ts` (`RETENTION_MONTHS = 24`).

Purge runs in **jobs**, not in request handlers (P3.8).
