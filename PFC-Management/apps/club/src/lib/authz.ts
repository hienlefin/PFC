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
import { writeSensitiveAudit } from "./audit";

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

/**
 * CM-104: `user` must come from HMAC-verified `requireSession` / `getSession`.
 * Never accept userId / role / isSuperAdmin from the client body.
 */
export function requireClubPermission(
  user: SessionUser,
  clubId: string,
  permission: Permission,
): void {
  if (!user?.id) {
    throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
  }
  if (user.isSuperAdmin) {
    writeSensitiveAudit({
      actorId: user.id,
      action: "rbac.bypass",
      resourceType: "club",
      resourceId: clubId,
      clubId,
      result: "allow",
      bypass: true,
      metadata: { permission },
    });
    return;
  }
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

export type SensitiveActionSpec = {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Same allow/deny as requireClubPermission; 403 on this spec is audited (CM-106). */
export function requireSensitivePermission(
  user: SessionUser,
  clubId: string,
  permission: Permission,
  spec: SensitiveActionSpec,
): { bypass: boolean } {
  try {
    requireClubPermission(user, clubId, permission);
  } catch (err) {
    if (err instanceof AppError && err.status === 403) {
      writeSensitiveAudit({
        actorId: user.id,
        action: spec.action,
        resourceType: spec.resourceType,
        resourceId: spec.resourceId ?? clubId,
        clubId,
        result: "deny",
        bypass: false,
        metadata: { permission, ...spec.metadata },
      });
    }
    throw err;
  }
  return { bypass: user.isSuperAdmin };
}
