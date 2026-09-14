import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { signSessionToken, verifySessionToken } from "./session-token";

const SECRET = "test-club-session-secret-do-not-use-in-prod";

function expect401(fn: () => unknown) {
  try {
    fn();
    throw new Error("expected 401");
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    const e = err as AppError;
    expect(e.status).toBe(401);
    expect(e.code).toBe("UNAUTHENTICATED");
  }
}

describe("CM-104 HMAC session cookie", () => {
  const prevSecret = process.env.CLUB_SESSION_SECRET;
  const prevTtl = process.env.CLUB_SESSION_TTL_SECONDS;

  beforeEach(() => {
    process.env.CLUB_SESSION_SECRET = SECRET;
    delete process.env.CLUB_SESSION_TTL_SECONDS;
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CLUB_SESSION_SECRET;
    else process.env.CLUB_SESSION_SECRET = prevSecret;
    if (prevTtl === undefined) delete process.env.CLUB_SESSION_TTL_SECONDS;
    else process.env.CLUB_SESSION_TTL_SECONDS = prevTtl;
  });

  it("accepts a valid signed cookie and returns sub (not role)", () => {
    const token = signSessionToken({ sub: "member_abc", nowMs: 1_700_000_000_000 });
    const claims = verifySessionToken(token, 1_700_000_000_000);
    expect(claims.sub).toBe("member_abc");
    expect(claims).not.toHaveProperty("isSuperAdmin");
    expect(claims).not.toHaveProperty("role");
  });

  it("rejects a tampered payload (object-level: cannot swap user id)", () => {
    const token = signSessionToken({ sub: "victim", nowMs: 1_700_000_000_000 });
    const [payloadB64, sig] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: "attacker",
        iat: 1_700_000_000,
        exp: 1_700_000_000 + 86400,
        isSuperAdmin: true,
      }),
      "utf8",
    ).toString("base64url");
    expect(tamperedPayload).not.toBe(payloadB64);
    expect401(() => verifySessionToken(`${tamperedPayload}.${sig}`));
  });

  it("rejects a tampered HMAC signature", () => {
    const token = signSessionToken({ sub: "member_abc" });
    const [payloadB64] = token.split(".");
    expect401(() => verifySessionToken(`${payloadB64}.AAAAAAAAAAAAAAAAAAAAAA`));
  });

  it("rejects an expired cookie", () => {
    const issued = 1_700_000_000_000;
    const token = signSessionToken({
      sub: "member_abc",
      nowMs: issued,
      ttlSeconds: 60,
    });
    expect401(() => verifySessionToken(token, issued + 61_000));
  });

  it("rejects unsigned legacy cookies (raw user id)", () => {
    expect401(() => verifySessionToken("plain-user-id-from-old-cookie"));
  });

  it("ignores privilege claims smuggled in a valid payload", () => {
    const token = signSessionToken({ sub: "member_abc" });
    const claims = verifySessionToken(token);
    expect(claims.sub).toBe("member_abc");
    expect("isSuperAdmin" in claims).toBe(false);
  });
});
