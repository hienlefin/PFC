import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import {
  POSITION_PERMISSIONS,
  type Permission,
  type Position,
  positionHasPermission,
} from "@/domain/permissions";
import { AppError } from "./errors";
import type { SessionUser } from "./auth";

export function getActiveMembership(clubId: string, memberId: string) {
  return db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.clubId, clubId),
        eq(memberships.memberId, memberId),
        eq(memberships.status, "active"),
      ),
    )
    .all()[0];
}

export function memberPermissions(
  user: SessionUser,
  clubId: string,
): Permission[] {
  if (user.isSuperAdmin) return [...Object.values(POSITION_PERMISSIONS.owner)];
  const m = getActiveMembership(clubId, user.id);
  if (!m) return [];
  return POSITION_PERMISSIONS[m.position as Position] ?? [];
}

export function requireClubPermission(
  user: SessionUser,
  clubId: string,
  permission: Permission,
): void {
  if (user.isSuperAdmin) return;
  const m = getActiveMembership(clubId, user.id);
  if (!m) {
    throw new AppError("FORBIDDEN", "Not a club member", 403);
  }
  if (!positionHasPermission(m.position as Position, permission)) {
    throw new AppError("FORBIDDEN", `Missing permission: ${permission}`, 403);
  }
}

export function isActiveMember(clubId: string, memberId: string): boolean {
  return !!getActiveMembership(clubId, memberId);
}
