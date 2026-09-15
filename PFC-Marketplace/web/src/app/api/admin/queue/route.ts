import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const items = await prisma.mktListing.findMany({
    where: { status: "PENDING" },
    include: { seller: true },
    orderBy: { updatedAt: "asc" },
  });
  return NextResponse.json({ items });
}
