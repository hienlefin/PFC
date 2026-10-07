import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasPermission, permissionsForRole, roleMatrix } from "./permissions";

describe("RBAC permissions", () => {
  it("buyer cannot manage roles or publish", () => {
    assert.equal(hasPermission("BUYER", "admin.roles"), false);
    assert.equal(hasPermission("BUYER", "admin.publish"), false);
    assert.equal(hasPermission("BUYER", "listing.create"), false);
    assert.equal(hasPermission("BUYER", "order.buy"), true);
  });

  it("seller can create listings but not assign roles", () => {
    assert.equal(hasPermission("SELLER", "listing.create"), true);
    assert.equal(hasPermission("SELLER", "seller.console"), true);
    assert.equal(hasPermission("SELLER", "admin.roles"), false);
  });

  it("admin has full matrix", () => {
    const perms = permissionsForRole("ADMIN");
    assert.ok(perms.includes("admin.roles"));
    assert.ok(perms.includes("listing.create"));
    assert.ok(perms.includes("order.buy"));
  });

  it("roleMatrix covers every permission row", () => {
    const rows = roleMatrix();
    assert.ok(rows.length >= 8);
    assert.ok(rows.every((r) => r.ADMIN));
  });
});
