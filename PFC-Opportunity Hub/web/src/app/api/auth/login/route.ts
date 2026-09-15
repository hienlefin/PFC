import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { findMemberByEmail } from "@/platform/directory";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Email và mật khẩu không hợp lệ" }, { status: 400 });
  }

  const member = await findMemberByEmail(body.data.email.toLowerCase());
  if (!member || !verifyPassword(body.data.password, member.passwordHash)) {
    return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }

  await createSession(member.id);
  return NextResponse.json({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
  });
}
