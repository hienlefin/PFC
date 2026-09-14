# PFC Opportunity Hub — Web (Wave P0)

Next.js 15 app scaffolded from **JobPulse** patterns (save/apply), UI tokens PFC purple (sourse mockups), deadline UX inspired by **opportunity-radar**.

## Run

```bash
cd "PFC-Opportunity Hub/web"
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000/login — session httpOnly, không đặt cookie member id.

| Role | Email | Password |
|------|-------|----------|
| Member | phuonglinh@pfc.vn | Linh-PFC-2026 |
| Provider | provider@pfc.vn | Provider-PFC-2026 |
| Reviewer | reviewer@pfc.vn | Reviewer-PFC-2026 |

Job expire/remind chỉ POST kèm header `x-cron-secret` (= `CRON_SECRET` trong `.env`). Postgres local: `docker compose up -d` rồi đổi `DATABASE_URL` (xem `.env.example`).

## P0 routes

| Path | Screen |
|------|--------|
| `/` | OPP-01 Hub home |
| `/opportunities` | OPP-02…04 list/filter |
| `/opportunities/[id]` | OPP-05 detail + save + external apply |
| `/saved` | OPP-11 |
| `/applications` | OPP-15/16 tracker |

## API

- `GET /api/opportunities`
- `GET /api/opportunities/:id`
- `POST|DELETE /api/opportunities/:id/save`
- `POST /api/opportunities/:id/apply/external` (+ `Idempotency-Key`)
- `GET /api/me/saves`
- `GET /api/me/applications`

SQLite local (`prisma/dev.db`) để chạy không cần Neon; production đổi `DATABASE_URL` Postgres.

## P1 / P2 routes

| Path | Mô tả |
|------|--------|
| `/notifications` | Reminder inbox + trigger jobs |
| `/provider` · `/provider/new` | Provider Draft → Submit |
| `/reviewer` | Verify / Reject Pending |
| `POST /api/jobs/expire` · `/api/jobs/remind` | Background jobs |
| `POST /api/opportunities/:id/apply/internal` | Internal apply |
