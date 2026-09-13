import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listQuerySchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { q, type, sort, page, pageSize } = parsed.data;
  const now = new Date();

  const where: Prisma.OppOpportunityWhereInput = {
    status: "VERIFIED",
    OR: [{ expireAt: null }, { expireAt: { gt: now } }],
  };

  if (type && type !== "ALL") where.type = type;
  if (q?.trim()) {
    where.AND = [
      {
        OR: [
          { title: { contains: q.trim() } },
          { summary: { contains: q.trim() } },
          { locationText: { contains: q.trim() } },
        ],
      },
    ];
  }

  const orderBy =
    sort === "deadline"
      ? [{ deadlineAt: "asc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const [total, items] = await Promise.all([
    prisma.oppOpportunity.count({ where }),
    prisma.oppOpportunity.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        provider: { select: { id: true, displayName: true, verificationTier: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
