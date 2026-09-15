import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderProfileId } from "@/lib/member";
import { assertTransition } from "@/domain/opportunity/status";

type Ctx = { params: Promise<{ id: string }> };

/** Draft → Pending (submit for review). Client cannot set Verified. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const providerId = await getProviderProfileId();
  if (!providerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const opp = await prisma.oppOpportunity.findUnique({ where: { id } });
  if (!opp || opp.providerId !== providerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    assertTransition(opp.status, "PENDING");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // Auto-check: external must have https URL
  if (
    (opp.applyMode === "EXTERNAL" || opp.applyMode === "BOTH") &&
    (!opp.externalUrl || !opp.externalUrl.startsWith("https://"))
  ) {
    return NextResponse.json({ error: "Auto-check failed: https externalUrl required" }, { status: 400 });
  }

  const updated = await prisma.oppOpportunity.update({
    where: { id },
    data: { status: "PENDING" },
  });

  await prisma.oppVerificationDecision.create({
    data: {
      opportunityId: id,
      actorId: providerId,
      fromStatus: opp.status,
      toStatus: "PENDING",
      reason: "Provider submitted for review",
    },
  });

  return NextResponse.json(updated);
}
