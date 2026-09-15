# ADR-004: Production launch scope (Club Management)

## Status
Accepted (G0 / CM-007, CM-008, CM-009)

## In scope (launch)
Club/Team CRUD, membership lifecycle, RBAC, tasks (Kanban/Timeline/Checklist), activities, internal docs + ACL, club reports, Shared Event **link**, audit, notifications hooks, authz tests.

## Out of scope (other modules / later epics)
Full community social feed/chat, Marketplace, VNPAY ticketing, multi-university tenancy, AI agents.

## Threat model (CM-008)
IDOR on club/task/doc IDs, vertical/horizontal privilege escalation, private club leak, document exfil via signed URL misuse.

## Capacity assumptions (CM-009)
10k clubs soft-cap; 5k members/club; 50k tasks/club; 10k docs/club; design indexes for list pagination; target p95 club list < 300ms on staging hardware baseline.

## Stack choice (reuse)
- Schema/RBAC pattern: **Atrium**
- Task workflow ideas: **ClubHub-Pro** (status enum + review, not Mongo flags)
- Local DX / Drizzle SQLite: **ClubKit-style** (no Clerk/Turso required for dev)
