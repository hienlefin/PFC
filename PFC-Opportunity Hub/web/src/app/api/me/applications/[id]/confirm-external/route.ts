import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";

type Ctx = { params: Promise<{ id: string }> };

/** A05: member marks external application as submitted after redirect */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const memberId = await getMemberId();

  const app = await prisma.oppApplication.findUnique({ where: { id } });
  if (!app || app.memberId !== memberId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (app.channel !== "EXTERNAL" || app.status !== "REDIRECTED") {
    return NextResponse.json({ error: "Only REDIRECTED external apps" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.oppApplication.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });
    await tx.oppApplicationEvent.create({
      data: {
        applicationId: id,
        fromStatus: "REDIRECTED",
        toStatus: "SUBMITTED",
        note: "Member confirmed external submission",
      },
    });
    return row;
  });

  return NextResponse.json(updated);
}
