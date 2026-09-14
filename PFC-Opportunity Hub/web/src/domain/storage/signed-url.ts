import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;

export function signAttachmentToken(
  attachmentId: string,
  secret: string,
  now = Date.now(),
): { token: string; expiresAt: Date } {
  if (!secret) throw new Error("CV signing secret missing");
  const exp = now + TTL_MS;
  const payload = `${attachmentId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return { token: `${payload}.${sig}`, expiresAt: new Date(exp) };
}

export function verifyAttachmentToken(
  token: string,
  secret: string,
  now = Date.now(),
): { attachmentId: string } | null {
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [attachmentId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!attachmentId || !Number.isFinite(exp) || exp <= now) return null;
  const payload = `${attachmentId}.${expRaw}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { attachmentId };
}
