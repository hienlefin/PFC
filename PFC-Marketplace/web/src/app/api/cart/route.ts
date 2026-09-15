import { NextResponse } from "next/server";
import { z } from "zod";
import { isUser, requireUser } from "@/lib/auth";
import { addToCart, getOpenCart } from "@/server/commerce";
import { prisma } from "@/lib/prisma";

function serializeCart(
  cart: Awaited<ReturnType<typeof getOpenCart>>,
) {
  return {
    id: cart.id,
    items: cart.items.map((i) => ({
      id: i.id,
      listingId: i.listingId,
      title: i.listing.title,
      priceVnd: i.listing.priceVnd,
      quantity: i.quantity,
      type: i.listing.type,
      coverTone: i.listing.coverTone,
    })),
    totalVnd: cart.items.reduce((s, i) => s + i.listing.priceVnd * i.quantity, 0),
  };
}

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const cart = await getOpenCart(user.id);
  return NextResponse.json({ cart: serializeCart(cart) });
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
    return NextResponse.json({ ok: true, itemCount: cart.items.length, cart: serializeCart(cart) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

const patchSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const cart = await getOpenCart(user.id);
  const item = cart.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  try {
    if (parsed.data.quantity === 0) {
      await prisma.mktCartItem.delete({ where: { id: item.id } });
    } else {
      if (item.listing.inventoryQty != null && parsed.data.quantity > item.listing.inventoryQty) {
        return NextResponse.json({ error: "Not enough inventory" }, { status: 400 });
      }
      await prisma.mktCartItem.update({
        where: { id: item.id },
        data: { quantity: parsed.data.quantity },
      });
    }
    const next = await getOpenCart(user.id);
    return NextResponse.json({ ok: true, cart: serializeCart(next) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
