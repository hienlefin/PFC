# ADR-005: Single-club product (not multi-tenant SaaS)

## Status
Accepted

## Decision
PFC Club Management serves **one** club (Personal Finance Club). There is no club marketplace / multi-tenant directory UX.

- Primary club slug: `pfc-investors`
- API resolves club via `getPrimaryClub()`
- `create_club` is rejected in API
- Mobile UI only for current phase (mockup-aligned)

## Consequences
Future multi-club would require a new ADR and product decision.
