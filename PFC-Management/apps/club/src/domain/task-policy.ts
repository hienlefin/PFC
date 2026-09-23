import { AppError } from "@/lib/errors";
import { assertDocumentUpload } from "./storage-policy";
import {
  assertTaskTransition,
  isReviewDecision,
  isTaskStatus,
  statusAfterReview,
  type ReviewDecision,
  type TaskStatus,
} from "./task-fsm";

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const MIN_REVIEW_REASON_LEN = 8;
export const MIN_TASK_TITLE_LEN = 1;

export function assertTaskTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length < MIN_TASK_TITLE_LEN) {
    throw new AppError("VALIDATION", "Task title required", 422);
  }
  return trimmed;
}

export function assertTaskPriority(priority: string | undefined): TaskPriority {
  const value = (priority ?? "medium").trim();
  if (!(TASK_PRIORITIES as readonly string[]).includes(value)) {
    throw new AppError("VALIDATION", `Invalid priority: ${value}`, 422);
  }
  return value as TaskPriority;
}

export function assertKnownTaskStatus(value: string): TaskStatus {
  if (!isTaskStatus(value)) {
    throw new AppError("VALIDATION", `Invalid task status: ${value}`, 422);
  }
  return value;
}

export function assertLegalTaskTransition(from: TaskStatus, to: TaskStatus): void {
  try {
    assertTaskTransition(from, to);
  } catch {
    throw new AppError(
      "ILLEGAL_TRANSITION",
      `Illegal task transition: ${from} → ${to}`,
      422,
    );
  }
}

export function assertReviewDecision(value: string): ReviewDecision {
  if (!isReviewDecision(value)) {
    throw new AppError("VALIDATION", `Invalid review decision: ${value}`, 422);
  }
  return value;
}

/** Approve may omit reason; request_changes and reject require a note. */
export function assertReviewReason(
  decision: ReviewDecision,
  reason: string | undefined,
): string | undefined {
  if (decision === "approve") return reason?.trim() || undefined;
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < MIN_REVIEW_REASON_LEN) {
    throw new AppError(
      "REVIEW_REASON_REQUIRED",
      `Review reason required (min ${MIN_REVIEW_REASON_LEN} characters)`,
      422,
    );
  }
  return trimmed;
}

export function reviewTargetStatus(decision: ReviewDecision): TaskStatus {
  return statusAfterReview(decision);
}

export function assertProofOfWorkUpload(input: {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}): string {
  const storageKey = input.storageKey.trim();
  if (!storageKey) {
    throw new AppError("PROOF_REQUIRED", "Proof-of-work storage key required", 422);
  }
  assertDocumentUpload({
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    virusScan: "skipped_dev",
  });
  return storageKey;
}

export function assertProofPresentForReview(proofOfWork: string | null | undefined): void {
  if (!proofOfWork?.trim()) {
    throw new AppError(
      "PROOF_REQUIRED",
      "Proof-of-work attachment required before review",
      422,
    );
  }
}

export function assertOptimisticTaskLock(
  actualUpdatedAt: Date | number | null | undefined,
  expectedUpdatedAt: number | undefined,
): void {
  if (expectedUpdatedAt === undefined) return;
  const actual =
    actualUpdatedAt instanceof Date
      ? actualUpdatedAt.getTime()
      : Number(actualUpdatedAt ?? 0);
  if (actual !== expectedUpdatedAt) {
    throw new AppError(
      "CONFLICT",
      "Task was updated concurrently; refresh and retry",
      409,
    );
  }
}

export function assertChecklistBelongsToTask(opts: {
  itemTaskId: string;
  expectedTaskId: string;
  taskClubId: string;
  expectedClubId?: string;
}): void {
  if (opts.itemTaskId !== opts.expectedTaskId) {
    throw new AppError("FORBIDDEN", "Checklist item not on this task", 403);
  }
  if (opts.expectedClubId && opts.taskClubId !== opts.expectedClubId) {
    throw new AppError("FORBIDDEN", "Resource not in club", 403);
  }
}
