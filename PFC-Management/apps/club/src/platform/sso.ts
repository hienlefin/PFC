/**
 * ADR-008 — Platform Core SSO **consumer** (not IdP).
 * Local password login remains when SSO is disabled.
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { clubFlags } from "@/platform/flags";
import { AppError } from "@/lib/errors";

export type SsoClaims = {
  sub: string;
  email: string;
  name: string;
};

export function ssoConfig(env: NodeJS.ProcessEnv = process.env) {
  const mode = (env.PLATFORM_SSO_MODE ?? "off").toLowerCase();
  return {
    mode: mode as "off" | "dev" | "oidc",
    enabled: mode === "dev" || mode === "oidc",
    issuer: env.PLATFORM_SSO_ISSUER ?? "",
    clientId: env.PLATFORM_SSO_CLIENT_ID ?? "pfc-club",
    authorizeUrl:
      env.PLATFORM_SSO_AUTHORIZE_URL ??
      (env.PLATFORM_SSO_ISSUER
        ? `${env.PLATFORM_SSO_ISSUER.replace(/\/$/, "")}/authorize`
        : ""),
    tokenUrl:
      env.PLATFORM_SSO_TOKEN_URL ??
      (env.PLATFORM_SSO_ISSUER
        ? `${env.PLATFORM_SSO_ISSUER.replace(/\/$/, "")}/token`
        : ""),
    redirectUri:
      env.PLATFORM_SSO_REDIRECT_URI ??
      "http://127.0.0.1:3000/api/club/sso/callback",
    sharedSecret: env.PLATFORM_SSO_SHARED_SECRET ?? "",
    scopes: env.PLATFORM_SSO_SCOPES ?? "openid profile email",
  };
}

export function isSsoEnabled(): boolean {
  return clubFlags().sso && ssoConfig().enabled;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64url");
}

function signDevToken(claims: SsoClaims, secret: string, ttlSec = 300): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      ...claims,
      iss: "pfc-platform-dev",
      aud: "pfc-club",
      iat: now,
      exp: now + ttlSec,
    }),
  );
  const sig = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function verifyHs256Jwt(token: string, secret: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AppError("SSO_INVALID", "Malformed SSO token", 401);
  }
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError("SSO_INVALID", "Invalid SSO signature", 401);
  }
  const body = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (typeof body.exp === "number" && now >= body.exp) {
    throw new AppError("SSO_EXPIRED", "SSO token expired", 401);
  }
  return body;
}

export function createSsoState(): string {
  return randomBytes(16).toString("hex");
}

/** Start URL for browser redirect (dev mode returns Club callback with minted token). */
export function buildSsoStartUrl(opts?: {
  email?: string;
  name?: string;
  state?: string;
}): { url: string; state: string; mode: string } {
  const cfg = ssoConfig();
  if (!isSsoEnabled()) {
    throw new AppError("SSO_DISABLED", "Platform SSO is not enabled", 400);
  }
  const state = opts?.state ?? createSsoState();
  if (cfg.mode === "dev") {
    if (!cfg.sharedSecret) {
      throw new AppError(
        "SSO_MISCONFIG",
        "PLATFORM_SSO_SHARED_SECRET required for SSO dev mode",
        500,
      );
    }
    const token = signDevToken(
      {
        sub: `plat_${(opts?.email ?? "leader@pfc.vn").split("@")[0]}`,
        email: opts?.email ?? "leader@pfc.vn",
        name: opts?.name ?? "PFC SSO User",
      },
      cfg.sharedSecret,
    );
    const u = new URL(cfg.redirectUri);
    u.searchParams.set("id_token", token);
    u.searchParams.set("state", state);
    return { url: u.toString(), state, mode: "dev" };
  }
  if (!cfg.authorizeUrl) {
    throw new AppError("SSO_MISCONFIG", "PLATFORM_SSO_AUTHORIZE_URL missing", 500);
  }
  const u = new URL(cfg.authorizeUrl);
  u.searchParams.set("response_type", "id_token");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("scope", cfg.scopes);
  u.searchParams.set("state", state);
  u.searchParams.set("nonce", createSsoState());
  return { url: u.toString(), state, mode: "oidc" };
}

export function parseSsoClaimsFromIdToken(idToken: string): SsoClaims {
  const cfg = ssoConfig();
  if (!cfg.sharedSecret && cfg.mode !== "oidc") {
    throw new AppError("SSO_MISCONFIG", "SSO secret missing", 500);
  }
  const secret = cfg.sharedSecret || process.env.PLATFORM_SSO_SHARED_SECRET || "";
  if (!secret) {
    throw new AppError(
      "SSO_MISCONFIG",
      "Set PLATFORM_SSO_SHARED_SECRET (or wire JWKS) to verify Core tokens",
      500,
    );
  }
  const body = verifyHs256Jwt(idToken, secret);
  const email = String(body.email ?? "");
  const sub = String(body.sub ?? "");
  const name = String(body.name ?? body.preferred_username ?? email);
  if (!email || !sub) {
    throw new AppError("SSO_INVALID", "SSO token missing email/sub", 401);
  }
  return { sub, email, name };
}
