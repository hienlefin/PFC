import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mustMember } from "@/lib/member";
import { rateLimit } from "@/lib/rate-limit";
import { isPubliclyVisible } from "@/domain/opportunity/status";
import { z } from "zod";

const schema = z.object({
  reason: z.enum([
    "SPAM",
    "SCAM",
    "MISLEADING",
    "INAPPROPRIATE",
    "OTHER",
  ]),
  details: z.string().max(2000).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const memberId = await mustMember();
  if (memberId instanceof NextResponse) return memberId;
  if (!rateLimit(`report:${memberId}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Quá nhiều báo cáo" }, { status: 429 });
  }
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const opp = await prisma.oppOpportunity.findUnique({ where: { id } });
  if (!opp || !isPubliclyVisible(opp.status, opp.expireAt)) {
    // Allow report on verified public only
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reuse verification decision table as audit trail for reports (lightweight)
  const decision = await prisma.oppVerificationDecision.create({
    data: {
      opportunityId: id,
      actorId: memberId,
      fromStatus: opp.status,
      toStatus: "REPORT",
      reason: `${body.data.reason}${body.data.details ? `: ${body.data.details}` : ""}`,
    },
  });

  return NextResponse.json({ ok: true, reportId: decision.id }, { status: 201 });
}
