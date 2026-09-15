import { NextResponse } from "next/server";
import { z } from "zod";
import { isUser, requireUser } from "@/lib/auth";
import { createListing } from "@/server/commerce";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.role !== "SELLER" && user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const seller = await prisma.mktSellerProfile.findUnique({ where: { memberId: user.id } });
  if (!seller) return NextResponse.json({ items: [] });
  const items = await prisma.mktListing.findMany({
    where: { sellerId: seller.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items, seller });
}

const schema = z.object({
  type: z.enum(["PHYSICAL", "DIGITAL", "SERVICE", "COURSE", "EVENT_TICKET"]),
  title: z.string().min(2),
  summary: z.string().optional(),
  description: z.string().min(2),
  priceVnd: z.number().int().min(0),
  inventoryQty: z.number().int().min(0).nullable().optional(),
  deliveryMeta: z.string().optional(),
  serviceMeta: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.role !== "SELLER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const listing = await createListing(user.id, parsed.data);
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
