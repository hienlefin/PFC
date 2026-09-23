/** Task lifecycle — ADR-002 / FR-CLB-004 (ClubHub-Pro workflow → status enum) */
export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** ADR-002: forward-only + cancel; review → done | in_progress | cancelled */
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ["todo", "cancelled"],
  todo: ["in_progress", "cancelled"],
  in_progress: ["review", "cancelled"],
  review: ["done", "in_progress", "cancelled"],
  done: [],
  cancelled: [],
};

export const REVIEW_DECISIONS = [
  "approve",
  "request_changes",
  "reject",
] as const;

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === "done" || status === "cancelled";
}

export function isReviewDecision(value: string): value is ReviewDecision {
  return (REVIEW_DECISIONS as readonly string[]).includes(value);
}

export function statusAfterReview(decision: ReviewDecision): TaskStatus {
  switch (decision) {
    case "approve":
      return "done";
    case "request_changes":
      return "in_progress";
    case "reject":
      return "cancelled";
  }
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Illegal task transition: ${from} → ${to}`);
  }
}

/** Kanban columns (production board) */
export const KANBAN_COLUMNS: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
];
