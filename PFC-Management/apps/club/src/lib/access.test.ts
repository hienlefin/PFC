import { describe, expect, it } from "vitest";
import { AppError, errorEnvelope } from "./errors";
import {
  assertCanViewClubContent,
  assertPositionPermission,
  assertResourceInClub,
} from "./access";
import { rejectClubTransition, CLUB_TRANSITION_REJECTION } from "./single-club";

describe("ADR-003 private club → HTTP 403", () => {
  it("authenticated non-member cannot view private content", () => {
    expect(() =>
      assertCanViewClubContent({
        visibility: "private",
        isMember: false,
        isAuthenticated: true,
      }),
    ).toThrow(AppError);

    try {
      assertCanViewClubContent({
        visibility: "private",
        isMember: false,
        isAuthenticated: true,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const e = err as AppError;
      expect(e.code).toBe("FORBIDDEN");
      expect(e.status).toBe(403);
      expect(e.message).toBe("Private club");
      const body = errorEnvelope(e, "test");
      expect(body.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
    }
  });

  it("pending (not active member) is treated as non-member on private club", () => {
    expect(() =>
      assertCanViewClubContent({
        visibility: "private",
        isMember: false,
        isAuthenticated: true,
      }),
    ).toThrow(/Private club/);
  });

  it("active member may view private club", () => {
    expect(() =>
      assertCanViewClubContent({
        visibility: "private",
        isMember: true,
        isAuthenticated: true,
      }),
    ).not.toThrow();
  });

  it("unauthenticated is 401, not 403", () => {
    try {
      assertCanViewClubContent({
        visibility: "private",
        isMember: false,
        isAuthenticated: false,
      });
      expect.fail("expected throw");
    } catch (err) {
      const e = err as AppError;
      expect(e.status).toBe(401);
      expect(e.code).toBe("UNAUTHENTICATED");
    }
  });

  it("open club: authenticated non-member may view", () => {
    expect(() =>
      assertCanViewClubContent({
        visibility: "open",
        isMember: false,
        isAuthenticated: true,
      }),
    ).not.toThrow();
  });
});

describe("ADR-003 missing permission → HTTP 403", () => {
  it("null position (outsider) cannot manage_tasks", () => {
    try {
      assertPositionPermission(null, "manage_tasks");
      expect.fail("expected throw");
    } catch (err) {
      const e = err as AppError;
      expect(e.status).toBe(403);
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("member cannot approve_memberships", () => {
    try {
      assertPositionPermission("member", "approve_memberships");
      expect.fail("expected throw");
    } catch (err) {
      const e = err as AppError;
      expect(e.status).toBe(403);
      expect(e.message).toContain("approve_memberships");
    }
  });

  it("leader may approve_memberships", () => {
    expect(() =>
      assertPositionPermission("leader", "approve_memberships"),
    ).not.toThrow();
  });

  it("T-01 IDOR: resource club mismatch is 403", () => {
    try {
      assertResourceInClub("club-a", "club-b");
      expect.fail("expected throw");
    } catch (err) {
      const e = err as AppError;
      expect(e.status).toBe(403);
      expect(e.message).toBe("Resource not in club");
    }
  });
});

describe("ADR-005 single-club disband / club_transition", () => {
  it("rejectClubTransition is HTTP 400 NOT_SUPPORTED", () => {
    expect(CLUB_TRANSITION_REJECTION.status).toBe(400);
    expect(CLUB_TRANSITION_REJECTION.code).toBe("NOT_SUPPORTED");
    try {
      rejectClubTransition();
      expect.fail("expected throw");
    } catch (err) {
      const e = err as AppError;
      expect(e.status).toBe(400);
      expect(e.code).toBe("NOT_SUPPORTED");
      const body = errorEnvelope(e);
      expect(body.status).toBe(400);
      expect(body.error.code).toBe("NOT_SUPPORTED");
    }
  });
});
