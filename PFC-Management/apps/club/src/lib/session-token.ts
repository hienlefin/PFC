/**
 * HMAC session cookie (CM-104). Cookie is not a DB table — no migration.
 * Claims in the token: sub + exp + iat only. Role / isSuperAdmin are never trusted
 * from the cookie; authz loads them from the DB after HMAC verify.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, timingSafeEqual } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { AppError } from "./errors";

const clubRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvConfig(clubRoot, process.env.NODE_ENV !== "production");

export const SESSION_COOKIE_NAME = "pfc_club_session";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

export type VerifiedSessionClaims = {
  sub: string;
  exp: number;
  iat: number;
};

function sessionSecret(): string {
  const secret = process.env.CLUB_SESSION_SECRET;
  if (!secret) {
    throw new AppError(
      "SESSION_SECRET_MISSING",
      "CLUB_SESSION_SECRET is not configured",
      500,
    );
  }
  return secret;
}

function ttlSeconds(): number {
  const raw = process.env.CLUB_SESSION_TTL_SECONDS;
  if (!raw) return DEFAULT_TTL_SECONDS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_SECONDS;
  return n;
}

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function hmac(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function unauthenticated(): never {
  throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
}

export function signSessionToken(input: {
  sub: string;
  nowMs?: number;
  ttlSeconds?: number;
}): string {
  const nowMs = input.nowMs ?? Date.now();
  const ttl = input.ttlSeconds ?? ttlSeconds();
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + ttl;
  const payloadB64 = b64urlJson({ sub: input.sub, iat, exp });
  const sig = hmac(payloadB64, sessionSecret());
  return `${payloadB64}.${sig}`;
}

/**
 * Verify HMAC then expiry. Tamper / malformed / expired → 401 (no silent null).
 * Extra fields (role, isSuperAdmin) in payload are ignored.
 */
export function verifySessionToken(
  token: string,
  nowMs: number = Date.now(),
): VerifiedSessionClaims {
  if (!token || !token.includes(".")) unauthenticated();
  const dot = token.indexOf(".");
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) unauthenticated();

  const expected = hmac(payloadB64, sessionSecret());
  if (!signaturesMatch(sig, expected)) unauthenticated();

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    unauthenticated();
  }

  if (!parsed || typeof parsed !== "object") unauthenticated();
  const rec = parsed as Record<string, unknown>;
  const sub = rec.sub;
  const exp = rec.exp;
  const iat = rec.iat;
  if (typeof sub !== "string" || !sub) unauthenticated();
  if (typeof exp !== "number" || !Number.isFinite(exp)) unauthenticated();
  if (typeof iat !== "number" || !Number.isFinite(iat)) unauthenticated();

  const nowSec = Math.floor(nowMs / 1000);
  if (nowSec >= exp) unauthenticated();

  return { sub, exp, iat };
}
