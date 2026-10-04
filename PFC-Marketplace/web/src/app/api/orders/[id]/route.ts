import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const order = await prisma.mktOrder.findUnique({
    where: { id },
    include: {
      items: { include: { listing: true } },
      payments: { orderBy: { createdAt: "desc" } },
      review: true,
      seller: true,
    },
  });
  if (!order || order.buyerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}
