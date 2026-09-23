import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, memberPlatformIds } from "@/db/schema";
import { AppError } from "./errors";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
};

function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSec,
  };
}

function sessionMaxAgeSec(): number {
  const raw = process.env.CLUB_SESSION_TTL_SECONDS;
  const n = raw ? Number(raw) : 60 * 60 * 24 * 7;
  return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 24 * 7;
}

async function establishSession(user: {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
}): Promise<SessionUser> {
  const token = signSessionToken({ sub: user.id });
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, cookieOptions(sessionMaxAgeSec()));
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const rows = db.select().from(members).where(eq(members.email, email)).all();
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new AppError("AUTH_INVALID", "Invalid email or password", 401);
  }
  return establishSession(user);
}

/** ADR-008 — establish session from Platform Core SSO claims (consume, not IdP). */
export async function loginWithSsoClaims(claims: {
  sub: string;
  email: string;
  name: string;
}): Promise<SessionUser> {
  const email = claims.email.trim().toLowerCase();
  const linked = db
    .select()
    .from(memberPlatformIds)
    .where(eq(memberPlatformIds.platformMemberId, claims.sub))
    .all()[0];

  let user = linked
    ? db.select().from(members).where(eq(members.id, linked.memberId)).all()[0]
    : db.select().from(members).where(eq(members.email, email)).all()[0];

  if (!user) {
    const id = nanoid();
    db.insert(members)
      .values({
        id,
        email,
        fullName: claims.name || email,
        passwordHash: "!",
        isSuperAdmin: false,
      })
      .run();
    db.insert(memberPlatformIds)
      .values({ memberId: id, platformMemberId: claims.sub })
      .run();
    user = db.select().from(members).where(eq(members.id, id)).all()[0]!;
  } else if (!linked) {
    db.insert(memberPlatformIds)
      .values({ memberId: user.id, platformMemberId: claims.sub })
      .run();
  }
  return establishSession(user);
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

/**
 * Missing cookie → null (anonymous).
 * Present but invalid/expired HMAC → 401 (no silent treat-as-logged-out).
 * Role / isSuperAdmin always loaded from DB after verify.
 */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const { sub } = verifySessionToken(raw);
  const rows = db.select().from(members).where(eq(members.id, sub)).all();
  const user = rows[0];
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
  }
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
  return s;
}

export function newCorrelationId(): string {
  return nanoid(12);
}
