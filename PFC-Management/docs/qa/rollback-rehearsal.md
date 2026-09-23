# CM-707 / EVD-CM-07 — Rollback rehearsal

## Feature-flag rollback (instant)

```bash
# Vercel / env
CLUB_FLAG_NOTIFY=0
CLUB_FLAG_RATE_LIMIT=0
CLUB_FLAG_JOBS=0
CLUB_FLAG_SIGNED_DOWNLOAD=0   # only if needed; prefer keep signed downloads on
```

## Schema rollback (one version)

```bash
cd PFC-Management/apps/club
npm run db:migrate:down
# Verify:
npx tsx -e "import { appliedMigrationVersions } from './src/db/migrator.ts'; console.log(appliedMigrationVersions())"
```

| Rehearsal | Result |
|-----------|--------|
| Date / env | |
| From version → to | e.g. 0005 → 0004 |
| App still boots? | ☐ |
| Known broken features after down | e.g. notifications table gone |
| Re-`migrate` up restored? | ☐ |

## Notes

- Never delete `membership_history` rows manually (append-only triggers).
- Prefer flag-off before migrate-down on production.
- Full restore from EVD-CM-06 snapshot if migrate-down is unsafe.

**Operator:** ________ **Date:** ________
