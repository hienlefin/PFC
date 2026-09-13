import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";
import { isPubliclyVisible } from "@/domain/opportunity/status";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const memberId = await getMemberId();

  const opp = await prisma.oppOpportunity.findUnique({ where: { id } });
  if (!opp || !isPubliclyVisible(opp.status, opp.expireAt)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const saved = await prisma.oppSavedOpportunity.upsert({
    where: { memberId_opportunityId: { memberId, opportunityId: id } },
    create: { memberId, opportunityId: id },
    update: {},
  });

  return NextResponse.json({ saved: true, id: saved.id }, { status: 201 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const memberId = await getMemberId();

  await prisma.oppSavedOpportunity.deleteMany({
    where: { memberId, opportunityId: id },
  });

  return NextResponse.json({ saved: false });
}
