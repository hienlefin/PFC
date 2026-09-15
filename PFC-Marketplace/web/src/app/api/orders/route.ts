import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const orders = await prisma.mktOrder.findMany({
    where: { buyerId: user.id },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items: orders });
}
