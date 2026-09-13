import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMemberId, getProviderProfileId } from "@/lib/member";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["INTERNSHIP", "JOB", "COMPETITION", "SCHOLARSHIP"]),
  title: z.string().min(3),
  summary: z.string().optional(),
  description: z.string().min(10),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  locationText: z.string().optional(),
  workMode: z.enum(["ONSITE", "REMOTE", "HYBRID"]).optional(),
  employmentType: z.enum(["CTV", "PART_TIME", "FULL_TIME"]).optional(),
  deadlineAt: z.string().optional().nullable(),
  applyMode: z.enum(["INTERNAL", "EXTERNAL", "BOTH"]).default("EXTERNAL"),
  externalUrl: z.string().url().optional().nullable(),
});

export async function GET() {
  const providerId = await getProviderProfileId();
  if (!providerId) {
    return NextResponse.json({ error: "Not a provider" }, { status: 403 });
  }
  const items = await prisma.oppOpportunity.findMany({
    where: { providerId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items });
}

/** Create Draft — inspired by jobhive POST /api/jobs */
export async function POST(req: NextRequest) {
  const providerId = await getProviderProfileId();
  const memberId = await getMemberId();
  if (!providerId) {
    // auto-bootstrap provider profile for demo provider member
    if (memberId !== "member_demo_provider") {
      return NextResponse.json({ error: "Not a provider" }, { status: 403 });
    }
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  let pid = providerId;
  if (!pid) {
    const created = await prisma.providerProfile.create({
      data: {
        memberId,
        displayName: "Demo Provider",
        verificationTier: "VERIFIED_PROVIDER",
      },
    });
    pid = created.id;
  }

  const d = body.data;
  if ((d.applyMode === "EXTERNAL" || d.applyMode === "BOTH") && !d.externalUrl) {
    return NextResponse.json({ error: "externalUrl required" }, { status: 400 });
  }

  const item = await prisma.oppOpportunity.create({
    data: {
      providerId: pid,
      type: d.type,
      title: d.title.trim(),
      summary: d.summary?.trim(),
      description: d.description.trim(),
      requirements: d.requirements?.trim(),
      benefits: d.benefits?.trim(),
      locationText: d.locationText?.trim(),
      workMode: d.workMode || "ONSITE",
      employmentType: d.employmentType,
      deadlineAt: d.deadlineAt ? new Date(d.deadlineAt) : null,
      expireAt: d.deadlineAt ? new Date(d.deadlineAt) : null,
      applyMode: d.applyMode,
      externalUrl: d.externalUrl || null,
      status: "DRAFT",
    },
  });

  return NextResponse.json(item, { status: 201 });
}
