# CM-706 / EVD-CM-06 — Staging soak + backup/restore

## Soak checklist (staging hoặc local dài hạn)

| Check | Target | Result |
|-------|--------|--------|
| `GET ?action=ready` | 200, migrations present | ☐ |
| Join / approve / task review loop | No 5xx | ☐ |
| Document soft-delete + signed download | No key leak | ☐ |
| Event link degrade path | `degraded: true` | ☐ |
| Rate limit 429 under burst join | Works | ☐ |
| Duration | ≥ 24h preferred | hours: ___ |

## Backup (SQLite local)

```bash
# Stop writers if possible
cp PFC-Management/apps/club/.data/club.sqlite \
   backups/club-$(date +%Y%m%d-%H%M).sqlite
```

## Backup (Turso)

```bash
# Via Turso dashboard snapshot / CLI dump per current Turso docs
# Record snapshot ID:
```

Snapshot ID / URL: _______________

## Restore drill

| Step | Done |
|------|:----:|
| Restore file/snapshot to throwaway DB | ☐ |
| `npm run db:migrate` (no-op if schema current) | ☐ |
| Login + `ready` + list members | ☐ |
| `PRAGMA foreign_key_check` / Turso integrity | ☐ |
| Confirm membership_history still intact | ☐ |

**Operator:** ________ **Date:** ________
