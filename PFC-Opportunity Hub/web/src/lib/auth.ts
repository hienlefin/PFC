import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE = "pfc_opp_session";
const SESSION_DAYS = 7;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
};

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export async function createSession(memberId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.oppSession.create({ data: { token, memberId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.oppSession.deleteMany({ where: { token } });
  }
  jar.delete(COOKIE);
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.oppSession.findUnique({
    where: { token },
    include: { member: true },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) await prisma.oppSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return {
    id: session.member.id,
    email: session.member.email,
    name: session.member.name,
    role: session.member.role,
  };
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireUser(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  return user;
}

export function isUser(value: AuthUser | NextResponse): value is AuthUser {
  return "role" in value;
}

export async function requireRole(role: MemberRole): Promise<AuthUser | NextResponse> {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.role !== role) return forbidden();
  return user;
}

export function assertCronSecret(header: string | null): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header || header !== secret) {
    return unauthorized("Invalid cron secret");
  }
  return null;
}
