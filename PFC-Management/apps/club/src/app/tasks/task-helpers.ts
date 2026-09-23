import type {
  ClubRole,
  CurrentUser,
  HistoryType,
  Task,
  TaskStatus,
} from "./task-types";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export function isDone(task: Task): boolean {
  return task.status === "done";
}

/** Đang mở = todo | doing | revision | redo (không gồm submitted) */
export function isOpenStatus(task: Task): boolean {
  return (
    task.status === "todo" ||
    task.status === "doing" ||
    task.status === "revision" ||
    task.status === "redo"
  );
}

export function isSubmitted(task: Task): boolean {
  return task.status === "submitted";
}

export function isOverdue(task: Task, now = new Date()): boolean {
  if (isDone(task) || isSubmitted(task)) return false;
  return new Date(task.dueDate).getTime() < now.getTime();
}

/**
 * Cần giục: chỉ todo/doing/revision/redo và (quá hạn hoặc < 48h).
 * Task đã nộp (submitted) không tính.
 */
export function needsReminder(task: Task, now = new Date()): boolean {
  if (!isOpenStatus(task)) return false;
  const due = new Date(task.dueDate).getTime();
  return due - now.getTime() < 48 * HOUR;
}

export function isDueSoon(task: Task, now = new Date()): boolean {
  if (!isOpenStatus(task) || isOverdue(task, now)) return false;
  return msUntilDue(task, now) < 48 * HOUR;
}

export function msUntilDue(task: Task, now = new Date()): number {
  return new Date(task.dueDate).getTime() - now.getTime();
}

export function formatDeadlineFull(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const weekday = d.toLocaleDateString("vi-VN", { weekday: "long" });
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const date = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time} · ${cap}, ${date}`;
}

export type RelativeTone = "muted" | "warn" | "danger" | "ok";

export function formatDeadlineRelative(
  task: Task,
  now = new Date(),
): { text: string; tone: RelativeTone } {
  if (isDone(task)) return { text: "Đã xong", tone: "ok" };
  if (isSubmitted(task)) return { text: "Chờ duyệt", tone: "muted" };

  const ms = msUntilDue(task, now);
  if (ms < 0) {
    const late = -ms;
    if (late < DAY) {
      const h = Math.max(1, Math.round(late / HOUR));
      return { text: `Quá hạn ${h} giờ`, tone: "danger" };
    }
    const days = Math.max(1, Math.round(late / DAY));
    return { text: `Quá hạn ${days} ngày`, tone: "danger" };
  }

  if (ms < DAY) {
    const h = Math.max(1, Math.round(ms / HOUR));
    return { text: `Còn ${h} giờ`, tone: "warn" };
  }

  if (ms < 48 * HOUR) {
    const days = Math.max(1, Math.round(ms / DAY));
    return { text: `Còn ${days} ngày`, tone: "warn" };
  }

  const days = Math.round(ms / DAY);
  return { text: `Còn ${days} ngày`, tone: "muted" };
}

export function formatLateDuration(dueIso: string, submittedAt: string): string {
  const late = new Date(submittedAt).getTime() - new Date(dueIso).getTime();
  if (late <= 0) return "";
  if (late < DAY) {
    const h = Math.max(1, Math.round(late / HOUR));
    return `Nộp trễ ${h} giờ`;
  }
  const days = Math.max(1, Math.round(late / DAY));
  return `Nộp trễ ${days} ngày`;
}

export function canAssignTask(user: CurrentUser): boolean {
  const ok: ClubRole[] = ["Trưởng ban", "Phó ban", "Chủ nhiệm", "Admin"];
  return ok.includes(user.clubRole);
}

export function canSubmit(task: Task, user: CurrentUser): boolean {
  if (user.id !== task.assigneeId) return false;
  return (
    task.status === "todo" ||
    task.status === "doing" ||
    task.status === "revision" ||
    task.status === "redo"
  );
}

export function canReview(task: Task, user: CurrentUser): boolean {
  if (task.status !== "submitted") return false;
  if (user.clubRole === "Chủ nhiệm" || user.clubRole === "Admin") return true;
  return user.id === task.supervisorId;
}

/** Submitted > 24h chưa duyệt → Chủ nhiệm/Admin nhắc take care */
export function needsReviewNudge(task: Task, now = new Date()): boolean {
  if (task.status !== "submitted") return false;
  const last = task.submissions[task.submissions.length - 1];
  if (!last || last.review) return false;
  return now.getTime() - new Date(last.submittedAt).getTime() > 24 * HOUR;
}

export function canRemindReview(task: Task, user: CurrentUser): boolean {
  if (user.clubRole !== "Chủ nhiệm" && user.clubRole !== "Admin") return false;
  return needsReviewNudge(task);
}

export function sortByDeadlineAsc(a: Task, b: Task): number {
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "todo":
      return "Chưa làm";
    case "doing":
      return "Đang làm";
    case "submitted":
      return "Chờ duyệt";
    case "revision":
      return "Cần chỉnh sửa";
    case "redo":
      return "Làm lại";
    case "done":
      return "Hoàn thành";
  }
}

export function latestReviewComment(task: Task): string | null {
  for (let i = task.submissions.length - 1; i >= 0; i--) {
    const r = task.submissions[i]?.review;
    if (r && (r.result === "revision" || r.result === "redo") && r.comment) {
      return r.comment;
    }
  }
  return null;
}

export function historyIcon(type: HistoryType): { icon: string; color: string } {
  switch (type) {
    case "assigned":
      return { icon: "＋", color: "#7c3aed" };
    case "submitted":
      return { icon: "↑", color: "#2563eb" };
    case "revision":
      return { icon: "✎", color: "#ea580c" };
    case "redo":
      return { icon: "↺", color: "#e11d48" };
    case "approved":
      return { icon: "✓", color: "#16a34a" };
    case "reminded":
      return { icon: "🔔", color: "#a16207" };
  }
}

export function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
