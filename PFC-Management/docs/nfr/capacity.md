# Club NFR / capacity (CM-009 / P1.10)

From ADR-004. Product is **one** club; numbers are schema/index headroom.

| Metric | Target |
|--------|--------|
| Clubs (soft cap) | 10_000 |
| Members / club | 5_000 |
| Tasks / club | 50_000 |
| Docs / club | 10_000 |
| p95 club/member list | < 300ms on staging baseline |

Indexes: see `REQUIRED_INDEXES` in `src/domain/capacity.ts` — created in `migrateUp`.

List APIs must paginate before hitting these caps (P4.17). This note is the P1 freeze, not a load-test report.
