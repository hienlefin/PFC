import { NextResponse } from "next/server";
import { z } from "zod";
import type { MemberRole } from "@prisma/client";
import { isUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { permissionsForRole, ROLE_LABELS } from "@/domain/permissions";

export async function GET() {
  const user = await requirePermission("admin.roles");
  if (!isUser(user)) return user;

  const members = await prisma.member.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      seller: { select: { id: true, displayName: true, verificationTier: true } },
    },
  });

  return NextResponse.json({
    items: members.map((m) => ({
      ...m,
      roleLabel: ROLE_LABELS[m.role],
      permissions: permissionsForRole(m.role),
    })),
  });
}

const patchSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["BUYER", "SELLER", "ADMIN"]),
});

export async function PATCH(req: Request) {
  const user = await requirePermission("admin.roles");
  if (!isUser(user)) return user;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { memberId, role } = parsed.data;
  if (memberId === user.id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Không thể tự hạ quyền Admin của chính mình" },
      { status: 400 },
    );
  }

  const target = await prisma.member.findUnique({ where: { id: memberId } });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: memberId },
      data: { role: role as MemberRole },
    });

    if (role === "SELLER") {
      const existing = await tx.mktSellerProfile.findUnique({ where: { memberId } });
      if (!existing) {
        await tx.mktSellerProfile.create({
          data: {
            memberId,
            displayName: member.name,
            verificationTier: "UNVERIFIED",
            payoutEligible: false,
          },
        });
      }
    }

    return member;
  });

  await writeAudit({
    actorId: user.id,
    action: "rbac.role_changed",
    entity: "member",
    entityId: memberId,
    meta: { from: target.role, to: role },
  });

  return NextResponse.json({
    ok: true,
    member: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      roleLabel: ROLE_LABELS[updated.role],
      permissions: permissionsForRole(updated.role),
    },
  });
}
