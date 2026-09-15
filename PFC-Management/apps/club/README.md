# PFC Club Management

Production Club Management module for **Personal Finance / PFC Digital Hub**.

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
npm run db:seed   # migrate + demo data
npm run test      # domain FSM/RBAC tests
npm run dev       # http://localhost:3000
```

Demo users: `leader@pfc.vn` / `member@pfc.vn` — password `PFC123!`

## API

Single resource `GET|POST /api/club` with `action` query/body (see `src/app/api/club/route.ts`).

Critical writes accept `Idempotency-Key` header.

## Data

SQLite file: `apps/club/.data/club.sqlite` (gitignored).
