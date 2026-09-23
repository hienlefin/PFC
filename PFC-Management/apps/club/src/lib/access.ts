import {
  canViewClubContent,
  type ClubVisibility,
} from "@/domain/visibility";
import {
  positionHasPermission,
  type Permission,
  type Position,
} from "@/domain/permissions";
import { AppError } from "./errors";

/** ADR-003: private club — authenticated non-member → 403 (not a hidden UI). */
export function assertCanViewClubContent(opts: {
  visibility: ClubVisibility;
  isMember: boolean;
  isAuthenticated: boolean;
}): void {
  if (!opts.isAuthenticated) {
    throw new AppError("UNAUTHENTICATED", "Authentication required", 401);
  }
  if (
    !canViewClubContent({
      visibility: opts.visibility,
      isMember: opts.isMember,
      isAuthenticated: true,
    })
  ) {
    throw new AppError("FORBIDDEN", "Private club", 403);
  }
}

/** Object-level RBAC: no position / missing permission → 403. */
export function assertPositionPermission(
  position: Position | null,
  permission: Permission,
): void {
  if (!position) {
    throw new AppError("FORBIDDEN", "Not a club member", 403);
  }
  if (!positionHasPermission(position, permission)) {
    throw new AppError("FORBIDDEN", `Missing permission: ${permission}`, 403);
  }
}

/** T-01 IDOR: resource must belong to the club in the request. */
export function assertResourceInClub(
  resourceClubId: string,
  clubId: string,
): void {
  if (resourceClubId !== clubId) {
    throw new AppError("FORBIDDEN", "Resource not in club", 403);
  }
}
