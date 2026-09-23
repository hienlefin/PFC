/** CM-604 — rate limit policy for sensitive Club mutations. */

export const RATE_LIMIT_POLICIES = {
  join_club: { limit: 10, windowMs: 60_000 },
  register_document: { limit: 20, windowMs: 60_000 },
  reorder_kanban: { limit: 60, windowMs: 60_000 },
  task_transition: { limit: 60, windowMs: 60_000 },
  invite: { limit: 20, windowMs: 60_000 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMIT_POLICIES;
