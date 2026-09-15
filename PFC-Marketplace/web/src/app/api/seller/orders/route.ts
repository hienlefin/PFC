import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.role !== "SELLER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const seller = await prisma.mktSellerProfile.findUnique({ where: { memberId: user.id } });
  if (!seller) return NextResponse.json({ items: [] });
  const items = await prisma.mktOrder.findMany({
    where: { sellerId: seller.id },
    include: { items: true, payments: true, payouts: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}
