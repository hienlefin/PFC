import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";

export async function GET() {
  const memberId = await getMemberId();
  const items = await prisma.oppNotification.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items });
}
