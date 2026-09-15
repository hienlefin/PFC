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

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ["todo", "cancelled"],
  todo: ["in_progress", "backlog", "cancelled"],
  in_progress: ["review", "todo", "cancelled"],
  review: ["done", "in_progress", "cancelled"],
  done: [],
  cancelled: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
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
