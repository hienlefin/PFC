# PFC Club Management

Production Club Management module for **Personal Finance / PFC Digital Hub**.

## Module boundary (CM-100 / ADR-006)

Owned paths: this package, `../../docs/adr/`, `../../Club_Management_TodoList.md` (`CODEOWNERS` → `@hienlefin`).

- `src/domain/` is pure FSM/policy (no Next, Drizzle, `@/db`).
- Do not import BeeCount, Opportunity Hub, Marketplace, Clerk, Turso, or Shared Event engine internals.
- Event integration is `club_event_links.external_event_id` only (FR-CLB-010).

## Reuse map (References)

| Concern | Source | How reused |
|---------|--------|------------|
| Permission / membership history | `References/Atrium` | Position→permission catalog, append-only membership history |
| Task assign → review → done | `References/ClubHub-Pro` | Workflow + PoW; status enum instead of Mongo flags |
| Local Drizzle/SQLite DX | `References/ClubKit` | File DB, server actions/API style — **no Clerk/Turso required** |

## Gates implemented in this codebase

- **G0** — ADRs in `../../docs/adr/`
- **G1** — SQLite migrate, audit, idempotency, error envelope, health API
- **G2** — Clubs, teams, membership FSM, RBAC, private visibility 403
- **G3** — Tasks, checklist, Kanban + Timeline views
- **G4** — Activities, documents meta, club report
- **G5** — `club_event_links` only (Shared Event contract)

## Run

```bash
cd apps/club
npm install
npm run db:migrate       # apply pending drizzle/*.sql
npm run db:migrate:down  # roll back exactly one applied version
npm run db:seed          # migrate up + demo data
npm run test
npm run dev              # http://localhost:3000
```

Demo users: `leader@pfc.vn` / `member@pfc.vn` — password `PFC123!`

## Env (session)

| Variable | Purpose |
|----------|---------|
| `CLUB_SESSION_SECRET` | HMAC-SHA256 key for the session cookie. **Required** in every environment; never commit a real value. |
| `CLUB_SESSION_TTL_SECONDS` | Cookie lifetime (default `604800` = 7 days). |
| `CLUB_DB_PATH` | SQLite file path (optional). |

Unsigned legacy cookies (raw member id) are rejected with **401**. Role / `isSuperAdmin` are loaded from the DB after HMAC verify (CM-104).

## API

Single resource `GET|POST /api/club` with `action` query/body (see `src/app/api/club/route.ts`).

Critical writes accept `Idempotency-Key` header.

## Data

SQLite file: `apps/club/.data/club.sqlite` (gitignored). On Vercel the file lives in `/tmp` (demo data may reset when the server sleeps).

## Migrations (CM-101)

`drizzle-kit generate` emits **UP SQL only** — there is no generated down. Each version is a pair:

| File | Change | Down |
|------|--------|------|
| `drizzle/0001_init_club.sql` | Create Club tables (members → clubs → teams → memberships/history → tasks/checklist → activities/participants → documents → `club_event_links` → audit → idempotency) | `0001_init_club.down.sql` — **not data-safe** (`DROP TABLE`, all rows gone). Backup first. |
| `drizzle/0002_secondary_indexes.sql` | Secondary indexes matching `src/db/schema.ts` | `0002_secondary_indexes.down.sql` — **safe** (`DROP INDEX` only; rows/FKs stay) |
| `drizzle/0003_audit_sensitive.sql` | `audit_events.bypass` + actor/action indexes (CM-106) | `0003_audit_sensitive.down.sql` — **safe** for Club rows (`DROP COLUMN bypass`). Flag lost; audit rows remain. |

Journal table: `schema_migrations`. `npm run db:migrate:down` reverts the **latest** journal row only (does not delete the SQLite file).

DBs created by the old inline `migrateUp()` (tables present, empty journal) are **stamped** as fully applied so the next down is `0002`, not a second CREATE.

After full up, the table/index set matches the previous single-blob DDL (no data-model change).
