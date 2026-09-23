# CM-712 — Evidence Pack index (EVD-CM-01…10)

Đính kèm link commit / Actions run / PDF khi có. Stub dưới đây đủ cho G7 **prep**; ô “Attached” đánh dấu khi đủ artifact.

| EVD | Nội dung | Seed in repo | Attached |
|-----|----------|--------------|:--------:|
| EVD-CM-01 | ADR + scope freeze | `docs/adr/ADR-001`…`007`, ADR-004 launch | ☐ |
| EVD-CM-02 | ERD / state machines | ADR-002, `domain/*-fsm.ts` | ☐ |
| EVD-CM-03 | OpenAPI + authz matrix | `apps/club/openapi.yaml` | ☐ |
| EVD-CM-04 | Test reports | CI `club-management` + `npm test` / `test:security` | ☐ |
| EVD-CM-05 | UAT sign-off | [uat-script](../uat-script-leader-member-admin.md) + [business-signoff](../business-signoff-club.md) | ☐ |
| EVD-CM-06 | Backup/restore | [staging-soak-backup-restore](../staging-soak-backup-restore.md) | ☐ |
| EVD-CM-07 | Rollback rehearsal | [rollback-rehearsal](../rollback-rehearsal.md) | ☐ |
| EVD-CM-08 | Production smoke | [smoke-script](../smoke-script-club.md) — **G8** | ☐ |
| EVD-CM-09 | Monitoring screenshots | metrics API + host dashboards — **G8** | ☐ |
| EVD-CM-10 | Privacy/retention | `docs/policy/data-classification.md`, CM-608 APIs | ☐ |

## How to produce EVD-CM-04 locally

```bash
cd PFC-Management/apps/club
npm ci
npx tsc --noEmit
npm run test:security
npm test
# Paste Actions URL or save terminal output under evidence/
```
See stub: [EVD-CM-04-test-report.md](./EVD-CM-04-test-report.md)

