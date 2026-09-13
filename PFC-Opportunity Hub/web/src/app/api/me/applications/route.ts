import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";

export async function GET() {
  const memberId = await getMemberId();
  const items = await prisma.oppApplication.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          type: true,
          deadlineAt: true,
          provider: { select: { displayName: true } },
        },
      },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json({ items });
}
