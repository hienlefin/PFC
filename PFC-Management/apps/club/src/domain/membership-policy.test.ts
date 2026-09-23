import { describe, expect, it } from "vitest";
import {
  assertPrivateJoinReason,
  assertRejectReason,
  assertCanDemoteOrKickOwner,
  isLastActiveOwner,
  MIN_JOIN_REASON_LEN,
} from "./membership-policy";

describe("private join reason", () => {
  it("requires a reason on private club", () => {
    expect(() => assertPrivateJoinReason("private", "short")).toThrow(
      /Join reason required/,
    );
    expect(assertPrivateJoinReason("private", "I want to learn PFC")).toBe(
      "I want to learn PFC",
    );
  });

  it("allows empty reason on open club", () => {
    expect(assertPrivateJoinReason("open", undefined)).toBe("");
  });
});

describe("reject reason", () => {
  it("requires reason when rejecting", () => {
    expect(() => assertRejectReason("rejected", "")).toThrow(
      /Reject reason required/,
    );
  });

  it("is optional when approving", () => {
    expect(assertRejectReason("active", undefined)).toBeUndefined();
  });
});

describe("last owner", () => {
  it("blocks demote/kick of sole active owner", () => {
    expect(
      isLastActiveOwner({
        position: "owner",
        status: "active",
        activeOwnerCount: 1,
      }),
    ).toBe(true);
    expect(() =>
      assertCanDemoteOrKickOwner({
        position: "owner",
        status: "active",
        activeOwnerCount: 1,
      }),
    ).toThrow(/last active owner/);
  });

  it("allows kick when another owner exists", () => {
    expect(() =>
      assertCanDemoteOrKickOwner({
        position: "owner",
        status: "active",
        activeOwnerCount: 2,
      }),
    ).not.toThrow();
  });

  it("allows kick of non-owner", () => {
    expect(() =>
      assertCanDemoteOrKickOwner({
        position: "member",
        status: "active",
        activeOwnerCount: 1,
      }),
    ).not.toThrow();
  });
});

describe("constants", () => {
  it("join reason minimum is 8", () => {
    expect(MIN_JOIN_REASON_LEN).toBe(8);
  });
});
