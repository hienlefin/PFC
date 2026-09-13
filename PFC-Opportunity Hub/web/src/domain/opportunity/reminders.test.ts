import test from "node:test";
import assert from "node:assert/strict";
import { dueWindows, isWindowDue, REMINDER_WINDOWS } from "./reminders";

test("PFC windows are T-7 T-3 T-1 T0 only", () => {
  assert.deepEqual(
    REMINDER_WINDOWS.map((w) => w.window),
    ["T-7", "T-3", "T-1", "T0"],
  );
});

test("isWindowDue respects 12h lag", () => {
  const now = Date.parse("2026-09-11T12:00:00Z");
  const deadline = now + 3 * 86400000; // T-3 fires at now
  assert.equal(isWindowDue(deadline, 3 * 86400000, now), true);
  assert.equal(isWindowDue(deadline, 7 * 86400000, now), false);
});

test("dueWindows returns matching window", () => {
  const now = Date.parse("2026-09-11T12:00:00Z");
  const deadline = new Date(now + 1 * 86400000);
  assert.deepEqual(dueWindows(deadline, now), ["T-1"]);
});
