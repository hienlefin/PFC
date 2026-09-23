# ADR-008: Platform integration contracts (SSO · Event · Notify · Moderation)

## Status
Accepted (Club consume-only)

## Context
Digital Hub needs Platform Core SSO, Shared Event Engine (tickets/VNPAY), Notification Services, and CMS-SYS moderation. ADR-004 / ADR-006 forbid implementing those **inside** `apps/club`. Club must **consume** published contracts and degrade when remote services are down.

## Decision

| Concern | Club does | Club does **not** |
|---------|-----------|-------------------|
| **A. SSO** | OIDC/JWT consumer + local password fallback | Identity Provider / user directory for all 6 Hubs |
| **B. Events** | `club_event_links` + deep-link CTA to Event Hub | Event CRUD, tickets, check-in, **VNPAY** |
| **C. Notify** | In-app inbox + email/push channel adapters | Own SMTP/APNs fleet |
| **D. Moderation** | Club **Hàng chờ duyệt** (membership pending, task review) | CMS-SYS queue for Learn/Finance/Project/Market/Opportunity posts |

### Env contracts
- `PLATFORM_SSO_*` — authorize URL / client / shared secret (dev mode allowed)
- `EVENT_ENGINE_BASE_URL` · `EVENT_HUB_PUBLIC_URL` — resolve + deep links
- `NOTIFY_EMAIL_*` / `NOTIFY_PUSH_WEBHOOK_URL` — real channels when set; else stub logs

## Consequences
- Feature flags in `platform/flags.ts`
- Fail-soft: SSO off → local login; Event engine down → degraded card + still deep-link; notify channel missing → stub log
- Cross-hub CMS remains a Platform epic outside Club CODEOWNERS
