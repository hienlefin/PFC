import { NextResponse } from "next/server";
import { isUser, requirePermission } from "@/lib/auth";
import { ALL_ROLES, ROLE_LABELS, roleMatrix } from "@/domain/permissions";

export async function GET() {
  const user = await requirePermission("admin.roles");
  if (!isUser(user)) return user;

  return NextResponse.json({
    roles: ALL_ROLES.map((role) => ({
      role,
      label: ROLE_LABELS[role],
    })),
    matrix: roleMatrix(),
    policy: "Phân quyền chỉ dành cho Chủ nhiệm câu lạc bộ và Trưởng câu lạc bộ",
  });
}
