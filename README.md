# Personal Finance

Umbrella workspace for personal-finance products and experiments.

## What's in this repo

| Path | Description |
|------|-------------|
| **PFC-Management/** | **PFC Digital Hub** — requirements, Club Management production app, ADRs, reference clones. Primary build target. |
| **PFC-Management/apps/club/** | **Club Management app** (Next.js) — run this for G0–G5 club ops. |
| **BeeCount-Cloud/** | Local Docker compose for BeeCount Cloud — exploration / reference. |
| **Test/** | Scratch / experiments. |

## PFC Digital Hub (main track)

PFC is a **Personal Finance Club** digital hub for students/young adults:

**MANAGE → LEARN → BUILD → EARN → GROW → CONTRIBUTE**

Current execution focus: **Club Management**

- Plan: `PFC-Management/Club_Management_TodoList.md`
- ADRs: `PFC-Management/docs/adr/`
- App: `PFC-Management/apps/club` (`npm run dev`)
- References reused: Atrium (RBAC), ClubHub-Pro (task workflow), ClubKit (Drizzle/SQLite DX)

## Remote

- GitHub: https://github.com/hienlefin/PFC  
  *(Repo name is historical; project scope = Personal Finance.)*

## Quick notes

- Do not commit secrets, deploy keys, or `BeeCount-Cloud/data/`.
- Reference apps under `PFC-Management/References/` are third-party snapshots for implementation patterns only.
