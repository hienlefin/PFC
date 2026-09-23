# CM-710 — Post-release watch

Window: first **72h** after go-live (adjust).

| Signal | Where | Threshold / action |
|--------|-------|--------------------|
| `club.http_403` spike | metrics / logs | Investigate private leak vs normal deny |
| `club.http_429` | rate limit | Tune if false positive |
| 5xx rate | host logs | Rollback flag or release |
| Login failures | auth logs | Secret mismatch? |
| Ready failing | uptime check | DB / storage |

Daily check log:

| Day | Reviewer | Notes | Escalate? |
|-----|----------|-------|-----------|
| D0 | | | ☐ |
| D1 | | | ☐ |
| D2 | | | ☐ |
| D3 | | | ☐ |
