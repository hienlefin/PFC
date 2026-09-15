# ADR-001: Club domain glossary & hierarchy

## Status
Accepted (G0 / CM-000)

## Context
PFC Digital Hub Community Hub requires a clear hierarchy distinct from Shared Event.

## Decision
- **PFC Community** = platform root (single logical community).
- **Club/Group** = managed org unit under Community (`clubs` table).
- **Team** = sub-unit under a Club (ban / working group).
- **Activity/Campaign** = internal club ops (≠ Event).
- **Event** = Shared Event Engine entity; Club only **links** (`club_event_links`).

## Consequences
No Event CRUD inside Club module. Activity and Event remain separate types.
