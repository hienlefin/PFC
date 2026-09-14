import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mustReviewer } from "@/lib/member";

export async function GET() {
  const actor = await mustReviewer();
  if (actor instanceof NextResponse) return actor;
  const items = await prisma.oppOpportunity.findMany({
    where: { status: "PENDING" },
    orderBy: { updatedAt: "asc" },
    include: { provider: { select: { displayName: true, verificationTier: true } } },
  });
  return NextResponse.json({ items });
}
