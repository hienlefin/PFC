import { NextResponse } from "next/server";
import { z } from "zod";
import { isUser, requireUser } from "@/lib/auth";
import { addToCart, getOpenCart } from "@/server/commerce";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const cart = await getOpenCart(user.id);
  return NextResponse.json({
    cart: {
      id: cart.id,
      items: cart.items.map((i) => ({
        id: i.id,
        listingId: i.listingId,
        title: i.listing.title,
        priceVnd: i.listing.priceVnd,
        quantity: i.quantity,
        type: i.listing.type,
      })),
      totalVnd: cart.items.reduce((s, i) => s + i.listing.priceVnd * i.quantity, 0),
    },
  });
}

const postSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const cart = await addToCart(user.id, parsed.data.listingId, parsed.data.quantity);
    return NextResponse.json({ ok: true, itemCount: cart.items.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
