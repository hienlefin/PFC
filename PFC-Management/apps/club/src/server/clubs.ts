import { nanoid } from "nanoid";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  memberships,
  membershipHistory,
  teams,
  tasks,
  activities,
  documents,
  clubEventLinks,
  auditEvents,
  members,
} from "@/db/schema";
import {
  canTransitionClub,
  canViewClubContent,
  type ClubVisibility,
} from "@/domain/visibility";
import {
  assertMembershipTransition,
  type MembershipStatus,
} from "@/domain/membership-fsm";
import type { Position } from "@/domain/permissions";
import { AppError } from "@/lib/errors";
import { requireClubPermission, isActiveMember } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function listClubsForUser(user: SessionUser) {
  const all = db.select().from(clubs).all();
  return all.filter((c) => {
    if (c.status === "disbanded") return false;
    if (user.isSuperAdmin) return true;
    if (c.visibility === "open" && c.status === "active") return true;
    return isActiveMember(c.id, user.id);
  });
}

/** Product is single-club: resolve the one active PFC club. */
export function getPrimaryClub() {
  const bySlug = db
    .select()
    .from(clubs)
    .where(eq(clubs.slug, "pfc-investors"))
    .all()[0];
  if (bySlug && bySlug.status !== "disbanded") return bySlug;
  const active = db
    .select()
    .from(clubs)
    .where(eq(clubs.status, "active"))
    .all()[0];
  if (active) return active;
  throw new AppError("NOT_FOUND", "Chưa cấu hình câu lạc bộ PFC", 404);
}

export function getClubOrThrow(clubId: string) {
  const club = db.select().from(clubs).where(eq(clubs.id, clubId)).all()[0];
  if (!club) throw new AppError("NOT_FOUND", "Club not found", 404);
  return club;
}

export function assertCanViewClub(user: SessionUser, clubId: string) {
  const club = getClubOrThrow(clubId);
  const member = isActiveMember(clubId, user.id);
  if (
    !canViewClubContent({
      visibility: club.visibility as ClubVisibility,
      isMember: member || user.isSuperAdmin,
      isAuthenticated: true,
    })
  ) {
    throw new AppError("FORBIDDEN", "Private club", 403);
  }
  return club;
}

export function createClub(
  user: SessionUser,
  input: { name: string; description?: string; visibility?: ClubVisibility },
) {
  const id = nanoid();
  const slugBase = slugify(input.name) || "club";
  const slug = `${slugBase}-${id.slice(0, 6)}`;
  db.insert(clubs)
    .values({
      id,
      name: input.name,
      slug,
      description: input.description ?? "",
      visibility: input.visibility ?? "private",
      status: "active",
      ownerId: user.id,
    })
    .run();
  db.insert(memberships)
    .values({
      id: nanoid(),
      clubId: id,
      memberId: user.id,
      position: "owner",
      status: "active",
    })
    .run();
  writeAudit({
    clubId: id,
    actorId: user.id,
    action: "club.create",
    objectType: "club",
    objectId: id,
  });
  return getClubOrThrow(id);
}

export function createTeam(
  user: SessionUser,
  clubId: string,
  input: { name: string; description?: string },
) {
  requireClubPermission(user, clubId, "manage_club");
  const id = nanoid();
  db.insert(teams)
    .values({
      id,
      clubId,
      name: input.name,
      description: input.description ?? "",
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "team.create",
    objectType: "team",
    objectId: id,
  });
  return id;
}

export function listTeams(clubId: string) {
  return db.select().from(teams).where(eq(teams.clubId, clubId)).all();
}

export function listMembers(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_members");
  return db
    .select({
      id: memberships.id,
      memberId: memberships.memberId,
      position: memberships.position,
      status: memberships.status,
      fullName: members.fullName,
      email: members.email,
    })
    .from(memberships)
    .innerJoin(members, eq(memberships.memberId, members.id))
    .where(eq(memberships.clubId, clubId))
    .all();
}

export function requestJoin(user: SessionUser, clubId: string) {
  const club = getClubOrThrow(clubId);
  if (club.status !== "active") {
    throw new AppError("CLUB_INACTIVE", "Club not accepting members", 400);
  }
  const existing = db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.clubId, clubId), eq(memberships.memberId, user.id)),
    )
    .all()[0];
  if (existing && ["pending", "active"].includes(existing.status)) {
    throw new AppError("ALREADY_MEMBER", "Already joined or pending", 409);
  }
  const id = nanoid();
  const auto = club.visibility === "open";
  const status = auto ? "active" : "pending";
  db.insert(memberships)
    .values({
      id,
      clubId,
      memberId: user.id,
      position: "member",
      status,
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: auto ? "membership.auto_join" : "membership.request",
    objectType: "membership",
    objectId: id,
  });
  return { id, status };
}

export function transitionMembership(
  user: SessionUser,
  membershipId: string,
  to: MembershipStatus,
  note?: string,
) {
  const m = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!m) throw new AppError("NOT_FOUND", "Membership not found", 404);
  requireClubPermission(user, m.clubId, "approve_memberships");
  assertMembershipTransition(m.status as MembershipStatus, to);
  db.update(memberships)
    .set({ status: to, updatedAt: new Date(), rejectReason: note ?? null })
    .where(eq(memberships.id, membershipId))
    .run();
  db.insert(membershipHistory)
    .values({
      id: nanoid(),
      membershipId,
      fromStatus: m.status,
      toStatus: to,
      actorId: user.id,
      note: note ?? null,
    })
    .run();
  writeAudit({
    clubId: m.clubId,
    actorId: user.id,
    action: "membership.transition",
    objectType: "membership",
    objectId: membershipId,
    meta: { from: m.status, to },
  });
}

export function assignPosition(
  user: SessionUser,
  membershipId: string,
  position: Position,
) {
  const m = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!m) throw new AppError("NOT_FOUND", "Membership not found", 404);
  requireClubPermission(user, m.clubId, "manage_roles");
  db.update(memberships)
    .set({ position, updatedAt: new Date() })
    .where(eq(memberships.id, membershipId))
    .run();
  writeAudit({
    clubId: m.clubId,
    actorId: user.id,
    action: "membership.assign_position",
    objectType: "membership",
    objectId: membershipId,
    meta: { position },
  });
}

export function transitionClubStatus(
  user: SessionUser,
  clubId: string,
  to: "active" | "archived" | "disbanded",
) {
  requireClubPermission(user, clubId, "manage_club");
  const club = getClubOrThrow(clubId);
  if (!canTransitionClub(club.status as never, to)) {
    throw new AppError(
      "ILLEGAL_TRANSITION",
      `Cannot transition club ${club.status} → ${to}`,
      422,
    );
  }
  db.update(clubs)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(clubs.id, clubId))
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "club.transition",
    objectType: "club",
    objectId: clubId,
    meta: { from: club.status, to },
  });
}

export function clubReport(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_reports");
  const memberRows = db
    .select()
    .from(memberships)
    .where(eq(memberships.clubId, clubId))
    .all();
  const taskRows = db.select().from(tasks).where(eq(tasks.clubId, clubId)).all();
  const activityRows = db
    .select()
    .from(activities)
    .where(eq(activities.clubId, clubId))
    .all();
  const docRows = db
    .select()
    .from(documents)
    .where(eq(documents.clubId, clubId))
    .all();
  const eventRows = db
    .select()
    .from(clubEventLinks)
    .where(eq(clubEventLinks.clubId, clubId))
    .all();
  return {
    members: {
      total: memberRows.length,
      active: memberRows.filter((m) => m.status === "active").length,
      pending: memberRows.filter((m) => m.status === "pending").length,
    },
    tasks: {
      total: taskRows.length,
      byStatus: Object.fromEntries(
        [...new Set(taskRows.map((t) => t.status))].map((s) => [
          s,
          taskRows.filter((t) => t.status === s).length,
        ]),
      ),
    },
    activities: activityRows.length,
    documents: docRows.filter((d) => !d.deletedAt).length,
    linkedEvents: eventRows.length,
  };
}

export function recentAudit(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_audit");
  return db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.clubId, clubId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(50)
    .all();
}
