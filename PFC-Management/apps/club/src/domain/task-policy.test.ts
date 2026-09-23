import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  REVIEW_DECISIONS,
  statusAfterReview,
  canTransitionTask,
} from "./task-fsm";
import {
  assertLegalTaskTransition,
  assertProofPresentForReview,
  assertReviewReason,
  assertTaskPriority,
  reviewTargetStatus,
} from "./task-policy";

describe("task review decisions map onto ADR-002", () => {
  it("approve → done, request_changes → in_progress, reject → cancelled", () => {
    expect(statusAfterReview("approve")).toBe("done");
    expect(statusAfterReview("request_changes")).toBe("in_progress");
    expect(statusAfterReview("reject")).toBe("cancelled");
    for (const d of REVIEW_DECISIONS) {
      expect(canTransitionTask("review", reviewTargetStatus(d))).toBe(true);
    }
  });

  it("request_changes and reject require a reason", () => {
    expect(() => assertReviewReason("request_changes", "short")).toThrow(AppError);
    expect(() => assertReviewReason("reject", "")).toThrow(AppError);
    expect(assertReviewReason("approve", undefined)).toBeUndefined();
  });

  it("illegal skip is 422 ILLEGAL_TRANSITION", () => {
    try {
      assertLegalTaskTransition("backlog", "done");
      expect.fail("expected throw");
    } catch (err) {
      const e = err as AppError;
      expect(e.code).toBe("ILLEGAL_TRANSITION");
      expect(e.status).toBe(422);
    }
  });

  it("rejects unknown priority", () => {
    expect(() => assertTaskPriority("urgent")).toThrow(AppError);
    expect(assertTaskPriority("high")).toBe("high");
  });

  it("blocks review submit without proof", () => {
    expect(() => assertProofPresentForReview(null)).toThrow(AppError);
  });
});
