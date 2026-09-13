import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";
import { assertTransition } from "@/domain/opportunity/status";
import { z } from "zod";

const schema = z.object({
  decision: z.enum(["VERIFIED", "REJECTED"]),
  reason: z.string().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const actorId = await getMemberId();
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const opp = await prisma.oppOpportunity.findUnique({ where: { id } });
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    assertTransition(opp.status, body.data.decision);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const updated = await prisma.oppOpportunity.update({
    where: { id },
    data: {
      status: body.data.decision,
      publishedAt: body.data.decision === "VERIFIED" ? new Date() : opp.publishedAt,
    },
  });

  await prisma.oppVerificationDecision.create({
    data: {
      opportunityId: id,
      actorId,
      fromStatus: opp.status,
      toStatus: body.data.decision,
      reason: body.data.reason || null,
    },
  });

  return NextResponse.json(updated);
}
