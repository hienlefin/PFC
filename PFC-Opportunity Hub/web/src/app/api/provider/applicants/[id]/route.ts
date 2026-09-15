import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderProfileId } from "@/lib/member";
import { z } from "zod";

/** Adapted from jobhive PATCH /api/applications/[id] */
const schema = z.object({
  status: z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"]),
  note: z.string().max(500).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_FROM: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  REDIRECTED: ["UNDER_REVIEW", "ACCEPTED", "REJECTED", "CLOSED"],
  UNDER_REVIEW: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
};

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const providerId = await getProviderProfileId();
  if (!providerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const app = await prisma.oppApplication.findUnique({
    where: { id },
    include: { opportunity: { select: { providerId: true } } },
  });

  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.opportunity.providerId !== providerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = ALLOWED_FROM[app.status] || [];
  if (!allowed.includes(body.data.status)) {
    return NextResponse.json(
      { error: `Cannot transition ${app.status} -> ${body.data.status}` },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.oppApplication.update({
      where: { id },
      data: { status: body.data.status },
    });
    await tx.oppApplicationEvent.create({
      data: {
        applicationId: id,
        fromStatus: app.status,
        toStatus: body.data.status,
        note: body.data.note || "Provider stage change",
      },
    });
    return row;
  });

  return NextResponse.json(updated);
}
