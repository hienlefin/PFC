import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mustMember } from "@/lib/member";

export async function GET() {
  const memberId = await mustMember();
  if (memberId instanceof NextResponse) return memberId;
  const items = await prisma.oppNotification.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items });
}
