/** CM-601 — Club notification event catalog (hooks only; no feed). */

export const NOTIFY_TYPES = [
  "membership.join_requested",
  "membership.approved",
  "membership.rejected",
  "membership.role_changed",
  "task.assigned",
  "task.deadline_soon",
  "task.review_requested",
  "activity.updated",
  "document.shared",
] as const;

export type NotifyType = (typeof NOTIFY_TYPES)[number];

export function isNotifyType(value: string): value is NotifyType {
  return (NOTIFY_TYPES as readonly string[]).includes(value);
}
