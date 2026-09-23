import { AppError } from "@/lib/errors";

/** FR-CLB-003 / P4B — join reasons + last-owner safety. */

export const MIN_JOIN_REASON_LEN = 8;
export const MIN_REJECT_REASON_LEN = 8;

export function assertPrivateJoinReason(
  visibility: string,
  reason: string | undefined,
): string {
  if (visibility !== "private") return (reason ?? "").trim();
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < MIN_JOIN_REASON_LEN) {
    throw new AppError(
      "JOIN_REASON_REQUIRED",
      `Join reason required for private club (min ${MIN_JOIN_REASON_LEN} characters)`,
      422,
    );
  }
  return trimmed;
}

export function assertRejectReason(
  toStatus: string,
  reason: string | undefined,
): string | undefined {
  if (toStatus !== "rejected") return reason?.trim() || undefined;
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < MIN_REJECT_REASON_LEN) {
    throw new AppError(
      "REJECT_REASON_REQUIRED",
      `Reject reason required (min ${MIN_REJECT_REASON_LEN} characters)`,
      422,
    );
  }
  return trimmed;
}

export function isLastActiveOwner(opts: {
  position: string;
  status: string;
  activeOwnerCount: number;
}): boolean {
  return (
    opts.position === "owner" &&
    opts.status === "active" &&
    opts.activeOwnerCount <= 1
  );
}

export function assertCanDemoteOrKickOwner(opts: {
  position: string;
  status: string;
  activeOwnerCount: number;
}): void {
  if (isLastActiveOwner(opts)) {
    throw new AppError(
      "LAST_OWNER",
      "Cannot demote or kick the last active owner",
      409,
    );
  }
}
