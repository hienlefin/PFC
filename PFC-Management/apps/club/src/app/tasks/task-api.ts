/**
 * Temporary API stubs — replace with real fetch/push later.
 */
import type {
  BranchId,
  EvidenceFile,
  Priority,
  ReviewResult,
  Task,
  TaskStatus,
} from "./task-types";
import { formatLateDuration } from "./task-helpers";

export type CreateTaskInput = {
  title: string;
  branchId: BranchId;
  assigneeId: string;
  supervisorId: string;
  dueDate: string;
  priority: Priority;
  note: string;
  actorId: string;
  status?: TaskStatus;
};

export type SubmitTaskInput = {
  links: string[];
  files: EvidenceFile[];
  note: string;
  actorId: string;
};

export type ReviewTaskInput = {
  result: ReviewResult;
  comment: string;
  reviewedBy: string;
  newDueDate: string | null;
};

export async function createTask(data: CreateTaskInput): Promise<Task> {
  const at = new Date().toISOString();
  const task: Task = {
    id: `t-${Date.now()}`,
    branchId: data.branchId,
    title: data.title.trim(),
    assigneeId: data.assigneeId,
    supervisorId: data.supervisorId,
    dueDate: data.dueDate,
    priority: data.priority,
    note: data.note.trim(),
    status: data.status ?? "todo",
    lastRemindedAt: null,
    lastReviewRemindedAt: null,
    submissions: [],
    history: [
      {
        id: `h-${Date.now()}`,
        type: "assigned",
        actorId: data.actorId,
        at,
        message: "Giao task",
      },
    ],
  };
  console.info("[api stub] createTask", task.id);
  return task;
}

export async function submitTask(
  task: Task,
  data: SubmitTaskInput,
): Promise<Task> {
  const submittedAt = new Date().toISOString();
  const lateMs =
    new Date(submittedAt).getTime() - new Date(task.dueDate).getTime();
  const isLate = lateMs > 0;
  const lateLabel = isLate
    ? formatLateDuration(task.dueDate, submittedAt)
    : null;
  const submission = {
    id: `s-${Date.now()}`,
    submittedAt,
    links: data.links.map((l) => l.trim()).filter(Boolean),
    files: data.files,
    note: data.note.trim(),
    isLate,
    lateLabel,
    review: null,
  };
  const next: Task = {
    ...task,
    status: "submitted",
    submissions: [...task.submissions, submission],
    history: [
      ...task.history,
      {
        id: `h-${Date.now()}`,
        type: "submitted",
        actorId: data.actorId,
        at: submittedAt,
        message: `Nộp lần ${task.submissions.length + 1}${isLate ? ` · ${lateLabel}` : ""}`,
      },
    ],
  };
  console.info("[api stub] submitTask", task.id);
  return next;
}

export async function reviewTask(
  task: Task,
  data: ReviewTaskInput,
): Promise<Task> {
  const reviewedAt = new Date().toISOString();
  const lastIdx = task.submissions.length - 1;
  if (lastIdx < 0) return task;
  const last = task.submissions[lastIdx]!;
  const review = {
    result: data.result,
    comment: data.comment.trim(),
    reviewedBy: data.reviewedBy,
    reviewedAt,
    newDueDate: data.newDueDate,
  };
  const submissions = task.submissions.map((s, i) =>
    i === lastIdx ? { ...s, review } : s,
  );

  let status: TaskStatus = task.status;
  let dueDate = task.dueDate;
  let historyType: "approved" | "revision" | "redo" = "approved";
  let message = "Duyệt hoàn thành";

  if (data.result === "approved") {
    status = "done";
    historyType = "approved";
    message = data.comment
      ? `Duyệt hoàn thành — ${data.comment}`
      : "Duyệt hoàn thành";
  } else if (data.result === "revision") {
    status = "revision";
    historyType = "revision";
    message = `Yêu cầu chỉnh sửa — ${data.comment}`;
    if (data.newDueDate) dueDate = data.newDueDate;
  } else {
    status = "redo";
    historyType = "redo";
    message = `Yêu cầu làm lại — ${data.comment}`;
    if (data.newDueDate) dueDate = data.newDueDate;
  }

  const next: Task = {
    ...task,
    status,
    dueDate,
    submissions,
    history: [
      ...task.history,
      {
        id: `h-${Date.now()}`,
        type: historyType,
        actorId: data.reviewedBy,
        at: reviewedAt,
        message,
      },
    ],
  };
  console.info("[api stub] reviewTask", task.id, data.result);
  return next;
}

export async function notifyAssignee(taskId: string): Promise<void> {
  console.info("[api stub] notifyAssignee", taskId);
}

export async function notifySupervisor(taskId: string): Promise<void> {
  console.info("[api stub] notifySupervisor", taskId);
}

export async function sendDeadlineReminder(
  taskId: string,
  recipientIds: string[],
): Promise<void> {
  console.info("[api stub] sendDeadlineReminder", taskId, recipientIds);
}

export async function sendReviewReminder(
  taskId: string,
  supervisorId: string,
): Promise<void> {
  console.info("[api stub] sendReviewReminder", taskId, supervisorId);
}
