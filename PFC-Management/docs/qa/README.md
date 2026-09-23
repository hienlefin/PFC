# Club QA — Gate G7 (CM-700…712)

Tài liệu bằng chứng / UAT / security pack cho Club Management.  
App: `PFC-Management/apps/club` · Todo: `Club_Management_TodoList.md` Track 7.

| Doc | CM | Mục đích |
|-----|----|----------|
| [test-matrix-club.md](./test-matrix-club.md) | CM-700 | Screen → FR → API → test → CM |
| [security-regression-pack.md](./security-regression-pack.md) | CM-702 | T-01…T-07 → vitest + CI |
| [functional-community-hub-event-link.md](./functional-community-hub-event-link.md) | CM-703 | Hub + event link script |
| [uat-script-leader-member-admin.md](./uat-script-leader-member-admin.md) | CM-704 | UAT Leader / Member / Admin |
| [business-signoff-club.md](./business-signoff-club.md) | CM-705 | Business sign-off |
| [staging-soak-backup-restore.md](./staging-soak-backup-restore.md) | CM-706 / EVD-06 | Soak + backup/restore |
| [rollback-rehearsal.md](./rollback-rehearsal.md) | CM-707 / EVD-07 | Migrate down + flags |
| [prod-config-secrets-checklist.md](./prod-config-secrets-checklist.md) | CM-708 | Secrets / config review |
| [smoke-script-club.md](./smoke-script-club.md) | CM-709 | Prod smoke (G8; template) |
| [post-release-watch.md](./post-release-watch.md) | CM-710 | Watch window |
| [training-outline-club-leader.md](./training-outline-club-leader.md) | CM-711 | Training outline |
| [evidence-pack/README.md](./evidence-pack/README.md) | CM-712 | EVD-CM-01…10 index |
**In-repo DoD (slice này):** matrix + security pack trong CI + critical-path vitest + UAT/evidence templates.  
**Chưa đủ exit gate đầy đủ:** soak staging thật, business signature, screenshot monitoring, prod smoke live.

