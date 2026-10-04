import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionListing, assertListingTransition } from "./listing-status";
import { canTransitionOrder } from "./order-status";
import { canTransitionPayment } from "./payment-status";
import { makeOrderCode, resolvePromo, splitPayout } from "./commerce-policy";

test("listing Draft→Pending→Published", () => {
  assert.equal(canTransitionListing("DRAFT", "PENDING"), true);
  assert.equal(canTransitionListing("PENDING", "PUBLISHED"), true);
  assert.equal(canTransitionListing("DRAFT", "PUBLISHED"), false);
  assert.throws(() => assertListingTransition("ARCHIVED", "PUBLISHED"));
});

test("order unpaid can pay or cancel", () => {
  assert.equal(canTransitionOrder("PENDING_PAYMENT", "PAID"), true);
  assert.equal(canTransitionOrder("PENDING_PAYMENT", "COMPLETED"), false);
});

test("payment pending to terminal", () => {
  assert.equal(canTransitionPayment("PENDING", "SUCCESS"), true);
  assert.equal(canTransitionPayment("SUCCESS", "FAILED"), false);
});

test("payout split uses commission bps", () => {
  const { commissionVnd, netVnd } = splitPayout(100_000, 500);
  assert.equal(commissionVnd, 5000);
  assert.equal(netVnd, 95_000);
});

test("promo and order code helpers", () => {
  assert.equal(resolvePromo("pfc50k"), 50000);
  assert.equal(resolvePromo("NOPE"), 0);
  assert.match(makeOrderCode(new Date("2026-09-15")), /^PFC260915\d{3}$/);
});
