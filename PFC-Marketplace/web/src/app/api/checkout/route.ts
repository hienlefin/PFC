import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { isUser, requireUser } from "@/lib/auth";
import { checkoutCart } from "@/server/commerce";

const schema = z.object({
  idempotencyKey: z.string().min(8).optional(),
  promoCode: z.string().optional().nullable(),
  shipName: z.string().min(2),
  shipPhone: z.string().min(8),
  shipAddress: z.string().min(5),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const headerKey = req.headers.get("idempotency-key");
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Thiếu thông tin giao hàng" }, { status: 400 });
  }
  const key = headerKey || body.data.idempotencyKey || `chk_${nanoid(16)}`;
  try {
    const order = await checkoutCart(user.id, {
      idempotencyKey: key,
      promoCode: body.data.promoCode,
      shipName: body.data.shipName,
      shipPhone: body.data.shipPhone,
      shipAddress: body.data.shipAddress,
    });
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderCode: order.orderCode,
      totalVnd: order.totalVnd,
      status: order.status,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 400 });
  }
}
