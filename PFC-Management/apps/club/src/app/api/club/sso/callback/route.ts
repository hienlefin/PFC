import { NextResponse } from "next/server";
import { loginWithSsoClaims } from "@/lib/auth";
import { errorEnvelope, AppError } from "@/lib/errors";
import { parseSsoClaimsFromIdToken, isSsoEnabled } from "@/platform/sso";
import { seedDemo } from "@/db/migrate";
import { newCorrelationId } from "@/lib/auth";

export async function GET(req: Request) {
  const correlationId = newCorrelationId();
  try {
    await seedDemo();
    if (!isSsoEnabled()) {
      throw new AppError("SSO_DISABLED", "Platform SSO is not enabled", 400);
    }
    const url = new URL(req.url);
    const idToken =
      url.searchParams.get("id_token") ??
      url.searchParams.get("token") ??
      "";
    if (!idToken) {
      throw new AppError("SSO_INVALID", "Missing id_token from Platform Core", 400);
    }
    const claims = parseSsoClaimsFromIdToken(idToken);
    await loginWithSsoClaims(claims);
    return NextResponse.redirect(new URL("/", req.url));
  } catch (err) {
    const envelope = errorEnvelope(err, correlationId);
    const login = new URL("/login", req.url);
    login.searchParams.set("sso_error", envelope.error?.code ?? "SSO_ERROR");
    return NextResponse.redirect(login);
  }
}
