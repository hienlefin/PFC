import assert from "node:assert/strict";
import test from "node:test";
import { signAttachmentToken, verifyAttachmentToken } from "./signed-url";

const secret = "test-secret";

test("signed token verifies and rejects tamper and expiry", () => {
  const now = 1_700_000_000_000;
  const { token } = signAttachmentToken("att_1", secret, now);
  assert.equal(verifyAttachmentToken(token, secret, now + 1000)?.attachmentId, "att_1");
  assert.equal(verifyAttachmentToken(token + "x", secret, now + 1000), null);
  assert.equal(verifyAttachmentToken(token, "other", now + 1000), null);
  assert.equal(verifyAttachmentToken(token, secret, now + 11 * 60 * 1000), null);
});
