import { NextResponse } from "next/server";
import { z } from "zod";
import { isUser, requireUser } from "@/lib/auth";
import { initiatePayment } from "@/server/commerce";

const schema = z.object({
  paymentMethod: z.enum(["VCB", "MOMO", "ZALOPAY", "CARD", "BANK"]).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const body = schema.safeParse(await req.json().catch(() => ({})));
  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/pay/result`;
  try {
    const result = await initiatePayment(
      id,
      user.id,
      returnUrl,
      body.success ? body.data.paymentMethod : undefined,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Pay failed" }, { status: 400 });
  }
}
