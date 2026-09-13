import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId } from "@/lib/member";
import { isPubliclyVisible } from "@/domain/opportunity/status";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
  idempotencyKey: z.string().min(8).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const memberId = await getMemberId();
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const opp = await prisma.oppOpportunity.findUnique({ where: { id } });
  if (!opp || !isPubliclyVisible(opp.status, opp.expireAt)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (opp.applyMode === "EXTERNAL") {
    return NextResponse.json({ error: "Internal apply not available" }, { status: 400 });
  }

  const key = body.data.idempotencyKey || req.headers.get("idempotency-key") || undefined;
  if (key) {
    const existing = await prisma.oppApplication.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      return NextResponse.json({ applicationId: existing.id, status: existing.status, reused: true });
    }
  }

  const app = await prisma.$transaction(async (tx) => {
    const created = await tx.oppApplication.create({
      data: {
        memberId,
        opportunityId: id,
        channel: "INTERNAL",
        status: "SUBMITTED",
        coverLetter: body.data.coverLetter,
        resumeUrl: body.data.resumeUrl,
        idempotencyKey: key,
      },
    });
    await tx.oppApplicationEvent.create({
      data: {
        applicationId: created.id,
        fromStatus: null,
        toStatus: "SUBMITTED",
        note: "Internal apply",
      },
    });
    return created;
  });

  return NextResponse.json(
    { applicationId: app.id, status: app.status, reused: false },
    { status: 201 },
  );
}
