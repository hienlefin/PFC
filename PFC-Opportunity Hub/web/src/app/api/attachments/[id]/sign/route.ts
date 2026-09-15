import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/member";
import { forbidden, unauthorized } from "@/lib/auth";
import { signingSecret } from "@/lib/signing-secret";
import { signAttachmentToken } from "@/domain/storage/signed-url";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getAuth();
  if (!user) return unauthorized();
  const secret = signingSecret();
  if (!secret) return NextResponse.json({ error: "CV signing is not configured" }, { status: 503 });

  const attachment = await prisma.oppAttachment.findUnique({
    where: { id },
    include: {
      application: { include: { opportunity: { select: { providerId: true } } } },
    },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ownsFile = attachment.ownerMemberId === user.id;
  const isReviewer = user.role === "REVIEWER";
  let isProvider = false;
  if (user.role === "PROVIDER" && attachment.application) {
    const profile = await prisma.providerProfile.findFirst({
      where: { memberId: user.id, id: attachment.application.opportunity.providerId },
    });
    isProvider = Boolean(profile);
  }
  if (!ownsFile && !isReviewer && !isProvider) return forbidden();

  const { token, expiresAt } = signAttachmentToken(attachment.id, secret);
  return NextResponse.json({
    url: `/api/cv/file?token=${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString(),
  });
}
