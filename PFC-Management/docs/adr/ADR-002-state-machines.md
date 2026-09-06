# ADR-002: Membership & task state machines

## Status
Accepted (G0 / CM-001, CM-004)

## Context
Server must enforce lifecycle transitions (SRS FR-CLB-003, FR-CLB-004; Checklist #254, #267).

## Decision

### Membership status
`pending → active | rejected`  
`active → inactive | left | alumni`  
`inactive → active | left`  
Terminal: `rejected`, `left`, `alumni` (alumni may be reactivated via explicit admin path → `active`).

### Task status
`backlog → todo → in_progress → review → done`  
Any non-terminal → `cancelled` (leader/manage_tasks only).  
`review → in_progress` (changes requested) or `done` (approved).

Transitions are validated in `src/domain/*-fsm.ts` before persistence.

## Consequences
Clients cannot set arbitrary status; APIs return 422 on illegal transitions.
