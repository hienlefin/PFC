# ADR-006: Club module boundary (ownership & forbidden imports)

## Status
Accepted (G1 / CM-100)

## Context
Club Management must remain a bounded module. Track 0 already froze glossary (ADR-001), Shared Event as **link-only** (ADR-003 / FR-CLB-010), launch in/out (ADR-004), and single-club product (ADR-005). Track 1 starts by encoding that freeze as ownership + import rules so later CM-* tasks cannot pull Event CRUD, Opportunity, Marketplace, or Clerk/Turso into this package.

`apps/club/CODEOWNERS` maps this package to `@hienlefin`. The same owner applies to `docs/adr/` and `Club_Management_TodoList.md` (listed in this ADR). GitHub only auto-routes reviews from a CODEOWNERS at repo root, `/docs`, or `/.github` — those paths are outside the Club package; platform wiring is not done in this ADR.

## Decision

### Ownership (CODEOWNERS)
| Path | Owner |
|------|--------|
| `PFC-Management/apps/club/` | Club Management (`@hienlefin`) |
| `PFC-Management/docs/adr/` | Club Management (`@hienlefin`) |
| `PFC-Management/Club_Management_TodoList.md` | Club Management (`@hienlefin`) |

Club code must not be edited to “fix” other modules; other modules must not import Club internals.

### Package & layers
- npm package name: `club` (`apps/club`).
- Layers: `src/domain/` (pure FSM/policy) ← `src/server/` + `src/lib/` (use-case, authz, audit) ← `src/app/` (API/UI).
- `src/domain/` must not import Next.js, Drizzle, or `@/db`.

### Forbidden imports (Club source)
Club `src/` must not import:

- Other PFC modules: `BeeCount-Cloud`, `PFC-Opportunity Hub`, Marketplace / Loyalty packages.
- Shared Event **engine internals** (Event CRUD, tickets, check-in, VNPAY). Club may store `club_event_links.external_event_id` only (ADR-001, ADR-003).
- Clerk / Turso clients (ADR-004 stack: local auth + Drizzle/SQLite).

Relative imports that resolve **outside** `apps/club` are forbidden.

### Allowed Event surface
`club_event_links` + API/UI that pass an opaque `externalEventId` (CM-500+). No `events` / `tickets` / payment tables in Club schema.

## Consequences
- Enforced by `src/domain/module-boundary.ts` + unit scan in `module-boundary.test.ts` and ESLint `no-restricted-imports`.
- Cross-module integration happens via published contracts later (CM-112 / CM-500), not source imports.
