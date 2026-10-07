import { NextResponse } from "next/server";
import { z } from "zod";
import { isUser, requirePermission } from "@/lib/auth";
import { createListing, submitListing } from "@/server/commerce";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requirePermission("seller.console");
  if (!isUser(user)) return user;
  const seller = await prisma.mktSellerProfile.findUnique({ where: { memberId: user.id } });
  if (!seller) return NextResponse.json({ items: [], seller: null });
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
  compareAtVnd: z.number().int().min(0).nullable().optional(),
  coverTone: z.enum(["violet", "indigo", "plum", "lilac", "berry"]).optional(),
  inventoryQty: z.number().int().min(0).nullable().optional(),
  deliveryMeta: z.string().optional(),
  serviceMeta: z.string().optional(),
  submitForReview: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await requirePermission("listing.create");
  if (!isUser(user)) return user;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    // Ensure seller profile exists (e.g. Admin newly granted listing.create)
    const existing = await prisma.mktSellerProfile.findUnique({ where: { memberId: user.id } });
    if (!existing) {
      await prisma.mktSellerProfile.create({
        data: {
          memberId: user.id,
          displayName: user.name,
          verificationTier: "UNVERIFIED",
          payoutEligible: false,
        },
      });
    }
    const { submitForReview, ...payload } = parsed.data;
    let listing = await createListing(user.id, payload);
    if (submitForReview) {
      listing = await submitListing(listing.id, user.id);
    }
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
