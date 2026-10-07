import { NextResponse } from "next/server";
import { isUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requirePermission("seller.console");
  if (!isUser(user)) return user;
  const seller = await prisma.mktSellerProfile.findUnique({ where: { memberId: user.id } });
  if (!seller) return NextResponse.json({ items: [] });
  const items = await prisma.mktOrder.findMany({
    where: { sellerId: seller.id },
    include: { items: true, payments: true, payouts: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}
