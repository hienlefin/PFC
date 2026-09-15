import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { AppError } from "./errors";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const COOKIE = "pfc_club_session";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
};

export async function login(email: string, password: string): Promise<SessionUser> {
  const rows = db.select().from(members).where(eq(members.email, email)).all();
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new AppError("AUTH_INVALID", "Invalid email or password", 401);
  }
  const jar = await cookies();
  jar.set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const rows = db.select().from(members).where(eq(members.id, id)).all();
  const user = rows[0];
  if (!user) return null;
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
