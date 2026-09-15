import { NextRequest, NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req.headers.get("x-cron-secret"));
  if (denied) return denied;
  const items = await prisma.oppDelivery.findMany({
    where: { status: { in: ["FAILED", "SKIPPED"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      channel: true,
      status: true,
      attempts: true,
      lastError: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ items });
}
