import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";

function secret(): string {
  return process.env.STORAGE_SIGNING_SECRET ?? "dev-storage-signing-secret";
}

export function signStorageKey(storageKey: string, ttlMs = 5 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${storageKey}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function resolveSignedStorageKey(token: string): string {
  let raw: string;
  try {
    raw = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    throw new AppError("FORBIDDEN", "Invalid download token", 403);
  }
  const parts = raw.split(".");
  if (parts.length < 3) {
    throw new AppError("FORBIDDEN", "Invalid download token", 403);
  }
  const sig = parts.pop()!;
  const expStr = parts.pop()!;
  const storageKey = parts.join(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    throw new AppError("FORBIDDEN", "Download token expired", 403);
  }
  const payload = `${storageKey}.${exp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError("FORBIDDEN", "Invalid download token", 403);
  }
  return storageKey;
}

export function storageReady(): boolean {
  return Boolean(secret());
}
