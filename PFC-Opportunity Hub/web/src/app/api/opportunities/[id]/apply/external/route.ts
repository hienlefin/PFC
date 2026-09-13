import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";
import { assertHttpsUrl, isPubliclyVisible } from "@/domain/opportunity/status";

type Ctx = { params: Promise<{ id: string }> };

/**
 * ADR-003: create application REDIRECTED before client opens external URL.
 * Idempotent via Idempotency-Key header.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const memberId = await getMemberId();
  const idempotencyKey = req.headers.get("idempotency-key") || undefined;

  const opp = await prisma.oppOpportunity.findUnique({ where: { id } });
  if (!opp || !isPubliclyVisible(opp.status, opp.expireAt)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (opp.applyMode === "INTERNAL") {
    return NextResponse.json({ error: "External apply not available" }, { status: 400 });
  }
  if (!opp.externalUrl) {
    return NextResponse.json({ error: "Missing external URL" }, { status: 400 });
  }

  try {
    assertHttpsUrl(opp.externalUrl);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (idempotencyKey) {
    const existing = await prisma.oppApplication.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return NextResponse.json({
        applicationId: existing.id,
        status: existing.status,
        externalUrl: opp.externalUrl,
        reused: true,
      });
    }
  }

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.oppApplication.create({
      data: {
        memberId,
        opportunityId: id,
        channel: "EXTERNAL",
        status: "REDIRECTED",
        outboundClickedAt: new Date(),
        idempotencyKey,
      },
    });
    await tx.oppApplicationEvent.create({
      data: {
        applicationId: app.id,
        fromStatus: null,
        toStatus: "REDIRECTED",
        note: "External apply tracked before redirect",
      },
    });
    return app;
  });

  return NextResponse.json(
    {
      applicationId: application.id,
      status: application.status,
      externalUrl: opp.externalUrl,
      reused: false,
    },
    { status: 201 },
  );
}
