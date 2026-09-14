# ADR-007: Production database — Turso (libSQL), local SQLite unchanged

## Status
Accepted (deploy prep / CM-101 hosting)

## Context
ADR-004 and ADR-006 chose **ClubKit-style local Drizzle/SQLite** (no Clerk, no Turso **required for development**). `better-sqlite3` writes a file on disk. That works on a laptop and fails on serverless hosts (Vercel): no durable local filesystem, native addon is a poor fit.

Club still must run `npm run dev` with a file DB. Production needs a hosted SQLite-compatible store.

## Decision
- **Local / CI / tests:** keep `better-sqlite3` + file path (`CLUB_DB_PATH` or `apps/club/.data/club.sqlite`). Do not remove this path.
- **Production:** when `TURSO_DATABASE_URL` is set, connect to **Turso (libSQL)** with `TURSO_AUTH_TOKEN`. Schema and SQL migrations stay the same SQLite dialect.
- Switch is **environment-only**. No second schema, no change to RBAC/authz, membership FSM, or Event link-only rules.
- `@libsql/client` / `libsql` may be imported **only from `src/db/`** (driver). Other Club layers keep talking to `db` / `sqlite` as today. Domain (`src/domain/`) still must not import any DB client.
- This **amends** the ADR-006 “no Turso clients” rule for the driver folder only. ADR-006 is not edited; Clerk, other PFC modules, and Shared Event engine internals stay forbidden.

## Consequences
- Operators follow `apps/club/DEPLOY.md` (Turso DB + Vercel env).
- Missing `TURSO_AUTH_TOKEN` while `TURSO_DATABASE_URL` is set is a fail-fast boot error.
- Tests do not set Turso env; they keep exercising the file SQLite path.
