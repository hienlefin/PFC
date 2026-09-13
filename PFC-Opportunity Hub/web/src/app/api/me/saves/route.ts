import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";

export async function GET() {
  const memberId = await getMemberId();
  const items = await prisma.oppSavedOpportunity.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: {
        include: {
          provider: { select: { displayName: true, verificationTier: true } },
        },
      },
    },
  });
  return NextResponse.json({ items });
}
