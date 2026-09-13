import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.oppOpportunity.findMany({
    where: { status: "PENDING" },
    orderBy: { updatedAt: "asc" },
    include: { provider: { select: { displayName: true, verificationTier: true } } },
  });
  return NextResponse.json({ items });
}
