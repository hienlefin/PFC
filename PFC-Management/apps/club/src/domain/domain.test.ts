import { describe, expect, it } from "vitest";
import {
  canTransitionMembership,
  assertMembershipTransition,
} from "./membership-fsm";
import { canTransitionTask, assertTaskTransition } from "./task-fsm";
import {
  positionHasPermission,
  POSITION_PERMISSIONS,
} from "./permissions";
import { canViewClubContent } from "./visibility";

describe("membership FSM", () => {
  it("allows pending → active", () => {
    expect(canTransitionMembership("pending", "active")).toBe(true);
  });
  it("blocks pending → alumni", () => {
    expect(canTransitionMembership("pending", "alumni")).toBe(false);
  });
  it("throws on illegal", () => {
    expect(() => assertMembershipTransition("rejected", "active")).toThrow();
  });
});

describe("task FSM", () => {
  it("supports ClubHub-style review → done", () => {
    expect(canTransitionTask("review", "done")).toBe(true);
  });
  it("blocks backlog → done", () => {
    expect(canTransitionTask("backlog", "done")).toBe(false);
  });
  it("throws on illegal", () => {
    expect(() => assertTaskTransition("done", "todo")).toThrow();
  });
});

describe("RBAC (Atrium-style)", () => {
  it("owner has manage_tasks", () => {
    expect(positionHasPermission("owner", "manage_tasks")).toBe(true);
  });
  it("member lacks approve_memberships", () => {
    expect(positionHasPermission("member", "approve_memberships")).toBe(false);
  });
  it("leader has full ops set", () => {
    expect(POSITION_PERMISSIONS.leader).toContain("link_events");
  });
});

describe("visibility", () => {
  it("private requires membership", () => {
    expect(
      canViewClubContent({
        visibility: "private",
        isMember: false,
        isAuthenticated: true,
      }),
    ).toBe(false);
  });
  it("open allows authenticated non-member view", () => {
    expect(
      canViewClubContent({
        visibility: "open",
        isMember: false,
        isAuthenticated: true,
      }),
    ).toBe(true);
  });
});
