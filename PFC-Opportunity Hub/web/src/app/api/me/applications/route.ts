import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mustMember } from "@/lib/member";

export async function GET() {
  const memberId = await mustMember();
  if (memberId instanceof NextResponse) return memberId;
  const items = await prisma.oppApplication.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          type: true,
          deadlineAt: true,
          provider: { select: { displayName: true } },
        },
      },
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
