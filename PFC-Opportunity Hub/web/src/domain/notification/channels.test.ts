import assert from "node:assert/strict";
import test from "node:test";
import { channelsFor, nextRetryAt } from "./channels";

test("channels follow preference and default to all on", () => {
  assert.deepEqual(channelsFor(null), ["IN_APP", "EMAIL", "PUSH"]);
  assert.deepEqual(channelsFor({ enabled: false, inApp: true, email: true, push: true }), []);
  assert.deepEqual(channelsFor({ enabled: true, inApp: false, email: true, push: false }), ["EMAIL"]);
});

test("retry backs off and caps at 60 minutes", () => {
  const now = 1_700_000_000_000;
  assert.equal(nextRetryAt(1, now).getTime() - now, 2 * 60_000);
  assert.equal(nextRetryAt(10, now).getTime() - now, 60 * 60_000);
});
