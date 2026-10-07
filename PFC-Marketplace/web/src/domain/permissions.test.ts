import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasPermission,
  isClubLeadership,
  permissionsForRole,
  roleMatrix,
} from "./permissions";

describe("RBAC permissions", () => {
  it("buyer and seller cannot manage roles", () => {
    assert.equal(hasPermission("BUYER", "admin.roles"), false);
    assert.equal(hasPermission("SELLER", "admin.roles"), false);
    assert.equal(hasPermission("BUYER", "listing.create"), false);
    assert.equal(hasPermission("SELLER", "listing.create"), true);
  });

  it("only Chủ nhiệm and Trưởng CLB can phân quyền", () => {
    assert.equal(hasPermission("CHU_NHIEM", "admin.roles"), true);
    assert.equal(hasPermission("TRUONG_CLB", "admin.roles"), true);
    assert.equal(isClubLeadership("CHU_NHIEM"), true);
    assert.equal(isClubLeadership("TRUONG_CLB"), true);
    assert.equal(isClubLeadership("SELLER"), false);
  });

  it("club leadership has full marketplace ops", () => {
    for (const role of ["CHU_NHIEM", "TRUONG_CLB"] as const) {
      const perms = permissionsForRole(role);
      assert.ok(perms.includes("admin.roles"));
      assert.ok(perms.includes("listing.create"));
      assert.ok(perms.includes("admin.publish"));
    }
  });

  it("roleMatrix marks leadership columns for admin.roles", () => {
    const row = roleMatrix().find((r) => r.permission === "admin.roles");
    assert.ok(row);
    assert.equal(row!.BUYER, false);
    assert.equal(row!.SELLER, false);
    assert.equal(row!.CHU_NHIEM, true);
    assert.equal(row!.TRUONG_CLB, true);
  });
});
