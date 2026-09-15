import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { initiatePayment } from "@/server/commerce";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/pay/result`;
  try {
    const result = await initiatePayment(id, user.id, returnUrl);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Pay failed" }, { status: 400 });
  }
}
