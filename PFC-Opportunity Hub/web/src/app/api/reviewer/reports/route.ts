import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";
import { z } from "zod";

const schema = z.object({
  decision: z.enum(["REJECTED", "VERIFIED"]),
  reason: z.string().optional(),
});

/** Takedown / resolve reported opportunity (reviewer) */
export async function POST(req: NextRequest) {
  const actorId = await getMemberId();
  const opportunityId = req.nextUrl.searchParams.get("opportunityId");
  if (!opportunityId) {
    return NextResponse.json({ error: "opportunityId required" }, { status: 400 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const opp = await prisma.oppOpportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.data.decision === "REJECTED" && opp.status === "VERIFIED") {
    // takedown
    const updated = await prisma.oppOpportunity.update({
      where: { id: opportunityId },
      data: { status: "REJECTED" },
    });
    await prisma.oppVerificationDecision.create({
      data: {
        opportunityId,
        actorId,
        fromStatus: "VERIFIED",
        toStatus: "REJECTED",
        reason: body.data.reason || "Takedown after report",
      },
    });
    return NextResponse.json(updated);
  }

  await prisma.oppVerificationDecision.create({
    data: {
      opportunityId,
      actorId,
      fromStatus: opp.status,
      toStatus: "REPORT_DISMISSED",
      reason: body.data.reason || "Report dismissed",
    },
  });

  return NextResponse.json({ ok: true, dismissed: true });
}

export async function GET() {
  const reports = await prisma.oppVerificationDecision.findMany({
    where: { toStatus: "REPORT" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items: reports });
}
