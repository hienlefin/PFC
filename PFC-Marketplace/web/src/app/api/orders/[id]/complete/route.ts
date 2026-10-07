import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { markOrderCompleted } from "@/server/commerce";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  try {
    const order = await markOrderCompleted(id, user.id, {
      asSeller: user.role === "SELLER",
      asAdmin: user.role === "CHU_NHIEM" || user.role === "TRUONG_CLB",
    });
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
