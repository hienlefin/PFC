# Opportunity Hub — Implementation TODO

Baseline: SRS **220–245** · App: `web/` · Refs: `ref-repos/`

| Wave | Status |
|------|--------|
| P0 OpportunityOS | Done |
| P1 ScholarTrack | Done |
| P2 job-board | Done (core) · Gate 7 sign-off còn manual |

## Remaining / optional
- [ ] T03 screenshots evidence
- [ ] J03 retry/alert production
- [ ] T06–T09 formal Gate 7 checklist sign-off

## Run
```bash
cd "PFC-Opportunity Hub/web"
npm run dev
```
http://localhost:3000

| Role | Cookie / path |
|------|----------------|
| Member | default · `/` `/opportunities` `/saved` `/applications` `/notifications` |
| Provider | `pfc_member_id=member_demo_provider` · `/provider` `/provider/applicants` `/provider/expired` |
| Reviewer | same provider cookie · `/reviewer` |
