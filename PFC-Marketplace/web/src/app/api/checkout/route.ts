import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { isUser, requireUser } from "@/lib/auth";
import { checkoutCart } from "@/server/commerce";

const schema = z.object({
  idempotencyKey: z.string().min(8).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const headerKey = req.headers.get("idempotency-key");
  const body = schema.safeParse(await req.json().catch(() => ({})));
  const key = headerKey || body.data?.idempotencyKey || `chk_${nanoid(16)}`;
  try {
    const order = await checkoutCart(user.id, key);
    return NextResponse.json({ ok: true, orderId: order.id, totalVnd: order.totalVnd, status: order.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 400 });
  }
}
