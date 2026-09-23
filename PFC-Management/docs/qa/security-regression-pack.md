# CM-702 — Security regression pack

Threat model: [`../security/threat-model-club.md`](../security/threat-model-club.md).

## Map threat → tests

| Threat | Expectation | Vitest files |
|--------|-------------|--------------|
| T-01 IDOR | Cross-club task/doc/membership → 403 | `object-authz.test.ts`, `route.http.test.ts`, `membership.lifecycle.test.ts`, `tasks.lifecycle.test.ts`, `ops.lifecycle.test.ts` |
| T-02 Vertical privilege | Client cannot set owner via body | `object-authz.test.ts`, `audit-sensitive.test.ts` |
| T-03 Horizontal privilege | Member cannot approve/review | `object-authz.test.ts`, `tasks.lifecycle.test.ts`, `membership.lifecycle.test.ts` |
| T-04 Private leak | Non-member / unauth → 401/403; search no leak | `access.test.ts`, `route.http.test.ts`, `g6.lifecycle.test.ts` |
| T-05 Doc exfil | No raw `storageKey` in list; signed token | `ops.lifecycle.test.ts`, `platform.test.ts` |
| T-06 Single-club | `create_club` / `club_transition` → 400 | `route.http.test.ts`, `access.test.ts`, `audit-sensitive.test.ts` |
| T-07 Replay | Idempotency key (covered via audit helper usage) | API uses `withIdempotency` — extend when TTL purge lands |

## Run locally / CI

```bash
cd PFC-Management/apps/club
npm run test:security
```

CI job `security` in `.github/workflows/club.yml` chạy cùng script.

## Pass criteria

- `npm run test:security` exit 0
- Không mở critical IDOR / private leak
