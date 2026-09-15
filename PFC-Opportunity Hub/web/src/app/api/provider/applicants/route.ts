import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderProfileId } from "@/lib/member";

/** List applicants for opportunities owned by current provider */
export async function GET(req: NextRequest) {
  const providerId = await getProviderProfileId();
  if (!providerId) {
    return NextResponse.json({ error: "Not a provider" }, { status: 403 });
  }

  const opportunityId = req.nextUrl.searchParams.get("opportunityId") || undefined;

  const items = await prisma.oppApplication.findMany({
    where: {
      opportunity: {
        providerId,
        ...(opportunityId ? { id: opportunityId } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, name: true, email: true } },
      opportunity: { select: { id: true, title: true, type: true } },
      history: { orderBy: { createdAt: "asc" } },
      attachment: { select: { id: true } },
    },
  });

  return NextResponse.json({
    items: items.map(({ resumeUrl: _hidden, attachment, ...rest }) => ({
      ...rest,
      attachmentId: attachment?.id ?? null,
    })),
  });
}
