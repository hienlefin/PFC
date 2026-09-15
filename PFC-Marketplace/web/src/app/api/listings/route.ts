import { NextResponse } from "next/server";
import type { ListingType } from "@prisma/client";
import { listPublished } from "@/server/commerce";

export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type") as ListingType | null;
  const items = await listPublished(type || undefined);
  return NextResponse.json({
    items: items.map((l) => ({
      id: l.id,
      type: l.type,
      title: l.title,
      summary: l.summary,
      priceVnd: l.priceVnd,
      compareAtVnd: l.compareAtVnd,
      ratingAvg: l.ratingAvg,
      ratingCount: l.ratingCount,
      coverTone: l.coverTone,
      sellerName: l.seller.displayName,
    })),
  });
}
