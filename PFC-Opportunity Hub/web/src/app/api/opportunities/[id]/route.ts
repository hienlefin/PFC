import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPubliclyVisible } from "@/domain/opportunity/status";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const item = await prisma.oppOpportunity.findUnique({
    where: { id },
    include: {
      provider: { select: { id: true, displayName: true, verificationTier: true } },
    },
  });

  if (!item || !isPubliclyVisible(item.status, item.expireAt)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}
