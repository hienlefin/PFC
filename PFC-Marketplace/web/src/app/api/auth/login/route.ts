import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 });
  }
  const member = await prisma.member.findUnique({ where: { email: parsed.data.email } });
  if (!member || !verifyPassword(parsed.data.password, member.passwordHash)) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }
  await createSession(member.id);
  return NextResponse.json({
    ok: true,
    user: { id: member.id, email: member.email, name: member.name, role: member.role },
  });
}
