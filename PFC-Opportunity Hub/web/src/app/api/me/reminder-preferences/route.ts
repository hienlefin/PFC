import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mustMember } from "@/lib/member";
import { z } from "zod";

const schema = z.object({
  enabled: z.boolean().optional(),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
});

export async function GET() {
  const memberId = await mustMember();
  if (memberId instanceof NextResponse) return memberId;
  const pref =
    (await prisma.oppReminderPreference.findUnique({ where: { memberId } })) ||
    (await prisma.oppReminderPreference.create({
      data: { memberId },
    }));
  return NextResponse.json(pref);
}

export async function PUT(req: NextRequest) {
  const memberId = await mustMember();
  if (memberId instanceof NextResponse) return memberId;
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const pref = await prisma.oppReminderPreference.upsert({
    where: { memberId },
    create: { memberId, ...body.data },
    update: body.data,
  });
  return NextResponse.json(pref);
}
