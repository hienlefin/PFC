import { NextResponse } from "next/server";
import { isUser, requirePermission } from "@/lib/auth";
import { ROLE_LABELS, roleMatrix } from "@/domain/permissions";

export async function GET() {
  const user = await requirePermission("admin.roles");
  if (!isUser(user)) return user;

  return NextResponse.json({
    roles: (["BUYER", "SELLER", "ADMIN"] as const).map((role) => ({
      role,
      label: ROLE_LABELS[role],
    })),
    matrix: roleMatrix(),
  });
}
