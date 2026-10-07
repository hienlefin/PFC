import { NextResponse } from "next/server";
import { isUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requirePermission("admin.queue");
  if (!isUser(user)) return user;
  const items = await prisma.mktListing.findMany({
    where: { status: "PENDING" },
    include: { seller: true },
    orderBy: { updatedAt: "asc" },
  });
  return NextResponse.json({ items });
}
