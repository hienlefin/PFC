# Opportunity Hub — Implementation TODO

Baseline: SRS **220–245** · App: `web/` · Refs: `ref-repos/`

| Wave | Status |
|------|--------|
| P0 OpportunityOS | Done |
| P1 ScholarTrack | Done |
| P2 job-board | Done (core) · Gate 7 sign-off còn manual |

## Remaining / optional
- [x] Session login (opaque token). Client cannot set member id.
- [x] Expire/remind locked with `x-cron-secret`
- [ ] PostgreSQL — `docker-compose.yml` ready; Docker is not installed. App stays on SQLite until a Postgres `DATABASE_URL` exists. Do not point Prisma at Postgres without a server.
- [x] Notification outbox (in-app / email / push) + retry. Email/push stay `SKIPPED` until SMTP or push webhook is set.
- [x] Private CV + signed URL (10 phút). Không trả storage path.
- [x] Worker `npm run worker` chạy expire / remind / dispatch. API job vẫn cần `x-cron-secret`.
- [x] Backup/restore scripts in `web/scripts`. Rollback = restore last backup, then restart app + worker.
- [ ] Nối Auth PFC Digital Hub — chưa có Platform Auth trong repo. `src/platform/directory.ts` là chỗ thay, không giả remote.
- [ ] Gate 7 sign-off người (penetration test, backup offsite, staging E2E).
- [ ] T03 screenshots evidence
- [ ] J03 retry/alert production
- [ ] T06–T09 formal Gate 7 checklist sign-off

## Run
```bash
cd "PFC-Opportunity Hub/web"
npm run dev
```
http://localhost:3000/login

| Role | Email | Password | Path |
|------|-------|----------|------|
| Member | phuonglinh@pfc.vn | Linh-PFC-2026 | `/` `/opportunities` `/saved` |
| Provider | provider@pfc.vn | Provider-PFC-2026 | `/provider` |
| Reviewer | reviewer@pfc.vn | Reviewer-PFC-2026 | `/reviewer` |
