import { nanoid } from "nanoid";
import { and, eq, desc } from "drizzle-orm";
import { db, sqlite } from "@/db";
import {
  clubs,
  memberships,
  membershipHistory,
  teams,
  tasks,
  activities,
  activityParticipants,
  documents,
  clubEventLinks,
  auditEvents,
  members,
  clubInviteTokens,
} from "@/db/schema";
import { canViewClubContent, type ClubVisibility } from "@/domain/visibility";
import { rejectClubTransition } from "@/lib/single-club";
import {
  assertMembershipTransition,
  type MembershipStatus,
} from "@/domain/membership-fsm";
import {
  assertCanDemoteOrKickOwner,
  assertPrivateJoinReason,
  assertRejectReason,
} from "@/domain/membership-policy";
import { POSITIONS, positionHasPermission, type Position } from "@/domain/permissions";
import {
  defaultTeamNameForPosition,
  normalizeTeamName,
  sanitizeTeamName,
} from "@/domain/team-policy";
import { AppError } from "@/lib/errors";
import {
  requireClubPermission,
  requireSensitivePermission,
  isActiveMember,
  getActiveMembership,
} from "@/lib/authz";
import { writeAudit, writeSensitiveAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import { notifyUser } from "@/platform/notify";
import { t } from "@/i18n/messages";
import { incMetric } from "@/platform/metrics";
import { scrubMemberPiiAfterExit } from "@/server/privacy";
import bcrypt from "bcryptjs";

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

/** CM-603 — discovery search; never returns unauthorized private clubs. */
export function searchDiscoverableClubs(user: SessionUser, query?: string) {
  const q = (query ?? "").trim().toLowerCase();
  return listClubsForUser(user)
    .filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
      );
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      visibility: c.visibility,
      status: c.status,
      description: c.description,
    }));
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

/** Chủ nhiệm (owner) only — team create / update / delete (spec CHUNHIEM). */
function requireOwnerForTeamMutation(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "manage_club");
  if (user.isSuperAdmin) return;
  const m = getActiveMembership(clubId, user.id);
  if (!m || m.position !== "owner") {
    throw new AppError(
      "FORBIDDEN",
      "Bạn không có quyền thực hiện thao tác này.",
      403,
    );
  }
}

function assertTeamNameAvailable(
  clubId: string,
  name: string,
  excludeTeamId?: string,
) {
  const normalized = normalizeTeamName(name);
  if (normalized.length < 2) {
    throw new AppError("VALIDATION", "Tên ban quá ngắn.", 422);
  }
  const clash = db
    .select()
    .from(teams)
    .where(and(eq(teams.clubId, clubId), eq(teams.nameNormalized, normalized)))
    .all()
    .find((t) => t.id !== excludeTeamId);
  if (clash) {
    throw new AppError(
      "TEAM_EXISTS",
      "Ban này đã tồn tại trong hệ thống.",
      409,
    );
  }
}

function findTeamByNormalizedName(clubId: string, displayName: string) {
  const normalized = normalizeTeamName(displayName);
  return db
    .select()
    .from(teams)
    .where(and(eq(teams.clubId, clubId), eq(teams.nameNormalized, normalized)))
    .all()[0];
}

export function createTeam(
  user: SessionUser,
  clubId: string,
  input: { name: string; description?: string },
) {
  requireOwnerForTeamMutation(user, clubId);
  const name = sanitizeTeamName(input.name);
  assertTeamNameAvailable(clubId, name);
  const id = nanoid();
  const now = new Date();
  db.insert(teams)
    .values({
      id,
      clubId,
      name,
      nameNormalized: normalizeTeamName(name),
      description: input.description?.trim() ?? "",
      createdAt: now,
      updatedAt: now,
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

export function updateTeam(
  user: SessionUser,
  teamId: string,
  input: { name?: string; description?: string },
) {
  const team = db.select().from(teams).where(eq(teams.id, teamId)).all()[0];
  if (!team) throw new AppError("NOT_FOUND", "Team not found", 404);
  requireOwnerForTeamMutation(user, team.clubId);
  const name =
    input.name !== undefined ? sanitizeTeamName(input.name) : undefined;
  if (name !== undefined) {
    assertTeamNameAvailable(team.clubId, name, teamId);
  }
  db.update(teams)
    .set({
      ...(name !== undefined
        ? { name, nameNormalized: normalizeTeamName(name) }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId))
    .run();
  writeAudit({
    clubId: team.clubId,
    actorId: user.id,
    action: "team.update",
    objectType: "team",
    objectId: teamId,
  });
  return teamId;
}

export function deleteTeam(user: SessionUser, teamId: string) {
  const team = db.select().from(teams).where(eq(teams.id, teamId)).all()[0];
  if (!team) throw new AppError("NOT_FOUND", "Team not found", 404);
  requireOwnerForTeamMutation(user, team.clubId);
  sqlite.transaction(() => {
    db.update(memberships)
      .set({ teamId: null, updatedAt: new Date() })
      .where(eq(memberships.teamId, teamId))
      .run();
    db.update(tasks)
      .set({ teamId: null, updatedAt: new Date() })
      .where(eq(tasks.teamId, teamId))
      .run();
    db.delete(teams).where(eq(teams.id, teamId)).run();
    writeAudit({
      clubId: team.clubId,
      actorId: user.id,
      action: "team.delete",
      objectType: "team",
      objectId: teamId,
    });
  })();
}

/**
 * Assign department (Ban).
 * - owner / leader (`manage_members`): any team or null
 * - trưởng ban (`ban_*`): only their own team
 */
export function assignMemberTeam(
  user: SessionUser,
  membershipId: string,
  teamId: string | null,
) {
  const m = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!m) throw new AppError("NOT_FOUND", "Membership not found", 404);
  const spec = {
    action: "membership.assign_team",
    resourceType: "membership",
    resourceId: membershipId,
    metadata: { from: m.teamId, to: teamId },
  };

  const actor = getActiveMembership(m.clubId, user.id);
  const canManageAll =
    user.isSuperAdmin ||
    (actor && positionHasPermission(actor.position as Position, "manage_members"));

  if (!canManageAll) {
    const isBanLead =
      actor &&
      String(actor.position).startsWith("ban_") &&
      actor.teamId &&
      teamId === actor.teamId;
    if (!isBanLead) {
      writeSensitiveAudit({
        actorId: user.id,
        action: spec.action,
        resourceType: spec.resourceType,
        resourceId: membershipId,
        clubId: m.clubId,
        result: "deny",
        bypass: false,
        metadata: { ...spec.metadata, reason: "department_scope" },
      });
      throw new AppError(
        "FORBIDDEN",
        "Bạn không có quyền thực hiện thao tác này.",
        403,
      );
    }
  } else {
    requireSensitivePermission(user, m.clubId, "manage_members", spec);
  }

  if (teamId) {
    const team = db.select().from(teams).where(eq(teams.id, teamId)).all()[0];
    if (!team || team.clubId !== m.clubId) {
      throw new AppError("NOT_FOUND", "Team not found in this club", 404);
    }
  }

  const bypass = user.isSuperAdmin;
  sqlite.transaction(() => {
    db.update(memberships)
      .set({ teamId, updatedAt: new Date() })
      .where(eq(memberships.id, membershipId))
      .run();
    writeSensitiveAudit({
      actorId: user.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: membershipId,
      clubId: m.clubId,
      result: "allow",
      bypass,
      metadata: spec.metadata,
    });
  })();
}

export function listTeams(user: SessionUser, clubId: string) {
  assertCanViewClub(user, clubId);
  const rows = db.select().from(teams).where(eq(teams.clubId, clubId)).all();
  const memberRows = db
    .select({ teamId: memberships.teamId })
    .from(memberships)
    .where(
      and(eq(memberships.clubId, clubId), eq(memberships.status, "active")),
    )
    .all();
  const counts = new Map<string, number>();
  for (const r of memberRows) {
    if (!r.teamId) continue;
    counts.set(r.teamId, (counts.get(r.teamId) ?? 0) + 1);
  }
  // Dedupe display by normalized name (legacy safety net)
  const seen = new Set<string>();
  const out: Array<{
    id: string;
    name: string;
    description: string;
    memberCount: number;
    createdAt: Date;
  }> = [];
  for (const t of rows.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )) {
    const key = t.nameNormalized ?? normalizeTeamName(t.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: t.id,
      name: t.name,
      description: t.description,
      memberCount: counts.get(t.id) ?? 0,
      createdAt: t.createdAt,
    });
  }
  return out;
}

export function listMembers(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_members");
  const rows = db
    .select({
      id: memberships.id,
      memberId: memberships.memberId,
      position: memberships.position,
      status: memberships.status,
      teamId: memberships.teamId,
      joinReason: memberships.joinReason,
      createdAt: memberships.createdAt,
      effectiveFrom: memberships.effectiveFrom,
      fullName: members.fullName,
      email: members.email,
    })
    .from(memberships)
    .innerJoin(members, eq(memberships.memberId, members.id))
    .where(eq(memberships.clubId, clubId))
    .all();

  const teamMap = new Map(
    db
      .select()
      .from(teams)
      .where(eq(teams.clubId, clubId))
      .all()
      .map((t) => [t.id, t.name]),
  );
  const clubTasks = db.select().from(tasks).where(eq(tasks.clubId, clubId)).all();
  const clubActivities = db
    .select()
    .from(activities)
    .where(eq(activities.clubId, clubId))
    .all();
  const activityIds = new Set(clubActivities.map((a) => a.id));
  const participants = db.select().from(activityParticipants).all().filter((p) =>
    activityIds.has(p.activityId),
  );

  return rows.map((m) => {
    const tasksDone = clubTasks.filter(
      (t) => t.assigneeId === m.memberId && t.status === "done",
    ).length;
    const tasksTotal = clubTasks.filter(
      (t) => t.assigneeId === m.memberId,
    ).length;
    const eventsJoined = participants.filter(
      (p) => p.memberId === m.memberId,
    ).length;
    const kpiScore = tasksDone * 10 + eventsJoined * 5;
    return {
      ...m,
      teamName: m.teamId ? teamMap.get(m.teamId) ?? null : null,
      studentCode: studentCodeFrom(m.email, m.memberId),
      tasksDone,
      tasksTotal,
      eventsJoined,
      kpiScore,
      joinedAt: m.effectiveFrom ?? m.createdAt,
    };
  });
}

function studentCodeFrom(email: string, memberId: string): string {
  const local = (email.split("@")[0] ?? "").trim();
  if (/^\d{5,}$/.test(local)) return local;
  return `SV${memberId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
}

export function getMemberHrProfile(user: SessionUser, membershipId: string) {
  const row = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!row) throw new AppError("NOT_FOUND", "Membership not found", 404);
  requireClubPermission(user, row.clubId, "view_members");
  const enriched = listMembers(user, row.clubId).find((m) => m.id === membershipId);
  if (!enriched) throw new AppError("NOT_FOUND", "Membership not found", 404);

  const assignedTasks = db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.clubId, row.clubId), eq(tasks.assigneeId, row.memberId)),
    )
    .all()
    .sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0))
    .slice(0, 12)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      updatedAt: t.updatedAt,
      kind: "task" as const,
    }));

  const clubActs = db
    .select()
    .from(activities)
    .where(eq(activities.clubId, row.clubId))
    .all();
  const actById = new Map(clubActs.map((a) => [a.id, a]));
  const joined = db
    .select()
    .from(activityParticipants)
    .where(eq(activityParticipants.memberId, row.memberId))
    .all()
    .filter((p) => actById.has(p.activityId))
    .map((p) => {
      const a = actById.get(p.activityId)!;
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        updatedAt: p.createdAt,
        kind: "activity" as const,
      };
    });

  const timeline = [...assignedTasks, ...joined].sort(
    (a, b) =>
      (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0),
  );

  return { member: enriched, timeline };
}

/** Idempotent HR demo roster for Members hub UI. */
export function ensureHrDemoMembers(clubId: string): void {
  const marker = db
    .select()
    .from(members)
    .where(eq(members.email, "hr.demo.leader@pfc.vn"))
    .all()[0];
  if (marker) return;

  const club = db.select().from(clubs).where(eq(clubs.id, clubId)).all()[0];
  if (!club) return;
  const hash = bcrypt.hashSync("PFC123!", 8);

  const ensureTeam = (name: string, description: string) => {
    const existing = db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.clubId, clubId),
          eq(teams.nameNormalized, normalizeTeamName(name)),
        ),
      )
      .all()[0];
    if (existing) return existing.id;
    const id = nanoid();
    const now = new Date();
    db.insert(teams)
      .values({
        id,
        clubId,
        name: sanitizeTeamName(name),
        nameNormalized: normalizeTeamName(name),
        description,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return id;
  };

  const teamCm = ensureTeam("Ban Chuyên môn", "Research & learning");
  const teamTt = ensureTeam("Ban Truyền thông", "Media & content");
  const teamSk = ensureTeam("Ban Sự kiện", "Events ops");
  const teamDn = ensureTeam("Ban Đối ngoại", "Partnerships");

  const roster: Array<{
    id: string;
    email: string;
    fullName: string;
    position: Position;
    teamId: string;
    studentCode: string;
  }> = [
    {
      id: "hr-demo-u01",
      email: "21520011@pfc.vn",
      fullName: "Nguyễn Đức Tuấn",
      position: "leader",
      teamId: teamTt,
      studentCode: "21520011",
    },
    {
      id: "hr-demo-u02",
      email: "21520022@pfc.vn",
      fullName: "Lê Minh Anh",
      position: "ban_chuyen_mon",
      teamId: teamCm,
      studentCode: "21520022",
    },
    {
      id: "hr-demo-u03",
      email: "21520033@pfc.vn",
      fullName: "Phạm Thu Hà",
      position: "ban_truyen_thong",
      teamId: teamTt,
      studentCode: "21520033",
    },
    {
      id: "hr-demo-u04",
      email: "21520044@pfc.vn",
      fullName: "Hoàng Gia Bảo",
      position: "ban_su_kien",
      teamId: teamSk,
      studentCode: "21520044",
    },
    {
      id: "hr-demo-u05",
      email: "21520055@pfc.vn",
      fullName: "Võ Ngọc Lan",
      position: "member",
      teamId: teamCm,
      studentCode: "21520055",
    },
    {
      id: "hr-demo-u06",
      email: "hr.demo.leader@pfc.vn",
      fullName: "Đặng Quốc Huy",
      position: "member",
      teamId: teamDn,
      studentCode: "21520066",
    },
  ];

  const activityId =
    db.select().from(activities).where(eq(activities.clubId, clubId)).all()[0]
      ?.id ?? null;

  for (const r of roster) {
    if (db.select().from(members).where(eq(members.id, r.id)).all()[0]) continue;
    db.insert(members)
      .values({
        id: r.id,
        email: r.email,
        fullName: r.fullName,
        passwordHash: hash,
        isSuperAdmin: false,
      })
      .run();
    const mid = `hr-demo-ms-${r.id.slice(-4)}`;
    db.insert(memberships)
      .values({
        id: mid,
        clubId,
        memberId: r.id,
        position: r.position,
        status: "active",
        teamId: r.teamId,
        effectiveFrom: new Date(Date.now() - 40 * 86400000),
      })
      .run();
    if (activityId) {
      db.insert(activityParticipants)
        .values({
          id: nanoid(),
          activityId,
          memberId: r.id,
          status: "joined",
        })
        .run();
    }
  }

  // Assign a few existing tasks to demo members for KPI
  const demoAssignee = "hr-demo-u01";
  const openTasks = db
    .select()
    .from(tasks)
    .where(eq(tasks.clubId, clubId))
    .all()
    .slice(0, 2);
  for (const t of openTasks) {
    if (!t.assigneeId) {
      db.update(tasks)
        .set({ assigneeId: demoAssignee, updatedAt: new Date() })
        .where(eq(tasks.id, t.id))
        .run();
    }
  }
}

export function getMyMembership(clubId: string, memberId: string) {
  return db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.clubId, clubId), eq(memberships.memberId, memberId)),
    )
    .all()[0];
}

export function countActiveOwners(clubId: string): number {
  return db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.clubId, clubId),
        eq(memberships.position, "owner"),
        eq(memberships.status, "active"),
      ),
    )
    .all().length;
}

export function requestJoin(
  user: SessionUser,
  clubId: string,
  joinReason?: string,
  inviteCode?: string,
  preferredTeamId?: string | null,
) {
  const club = getClubOrThrow(clubId);
  if (club.status !== "active") {
    throw new AppError("CLUB_INACTIVE", "Club not accepting members", 400);
  }
  const invite = inviteCode
    ? peekInviteToken(clubId, inviteCode.trim().toUpperCase())
    : null;
  const reason = invite
    ? (joinReason ?? "").trim()
    : assertPrivateJoinReason(club.visibility, joinReason);
  let teamId: string | null = null;
  if (preferredTeamId) {
    const team = db
      .select()
      .from(teams)
      .where(eq(teams.id, preferredTeamId))
      .all()[0];
    if (!team || team.clubId !== clubId) {
      throw new AppError("NOT_FOUND", "Preferred team not found", 404);
    }
    teamId = team.id;
  }
  const existing = getMyMembership(clubId, user.id);
  if (existing && ["pending", "active"].includes(existing.status)) {
    throw new AppError("ALREADY_MEMBER", "Already joined or pending", 409);
  }
  const id = existing?.status === "left" ? existing.id : nanoid();
  const auto = club.visibility === "open" || !!invite;
  const status = auto ? "active" : "pending";
  const now = new Date();
  sqlite.transaction(() => {
    if (existing?.status === "left") {
      db.update(memberships)
        .set({
          status,
          position: "member",
          teamId,
          joinReason: reason || null,
          rejectReason: null,
          effectiveFrom: auto ? now : null,
          effectiveTo: null,
          updatedAt: now,
        })
        .where(eq(memberships.id, existing.id))
        .run();
    } else {
      db.insert(memberships)
        .values({
          id,
          clubId,
          memberId: user.id,
          position: "member",
          status,
          teamId,
          joinReason: reason || null,
          ...(auto ? { effectiveFrom: now } : {}),
        })
        .run();
    }
    db.insert(membershipHistory)
      .values({
        id: nanoid(),
        membershipId: id,
        fromStatus: existing?.status ?? "none",
        toStatus: status,
        actorId: user.id,
        note: invite ? `invite:${invite.code}` : reason || null,
      })
      .run();
    if (invite) {
      db.update(clubInviteTokens)
        .set({ useCount: invite.useCount + 1 })
        .where(eq(clubInviteTokens.id, invite.id))
        .run();
    }
    writeAudit({
      clubId,
      actorId: user.id,
      action: auto ? "membership.auto_join" : "membership.request",
      objectType: "membership",
      objectId: id,
    });
  })();
  incMetric("club.joins");
  if (!auto) {
    notifyUser({
      recipientId: club.ownerId,
      clubId,
      type: "membership.join_requested",
      title: t("notify.join_requested"),
      body: user.fullName,
      payload: { membershipId: id, memberId: user.id },
    });
  }
  return { id, status, joinReason: reason };
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
  const spec = {
    action: "membership.transition",
    resourceType: "membership",
    resourceId: membershipId,
    metadata: { from: m.status, to },
  };
  const { bypass } = requireSensitivePermission(
    user,
    m.clubId,
    "approve_memberships",
    spec,
  );
  const cleanedNote = assertRejectReason(to, note);
  try {
    assertMembershipTransition(m.status as MembershipStatus, to);
  } catch {
    throw new AppError(
      "ILLEGAL_TRANSITION",
      `Cannot transition membership ${m.status} → ${to}`,
      422,
    );
  }
  const now = new Date();
  const patch: {
    status: MembershipStatus;
    updatedAt: Date;
    rejectReason: string | null;
    effectiveFrom?: Date | null;
    effectiveTo?: Date | null;
  } = {
    status: to,
    updatedAt: now,
    rejectReason: to === "rejected" ? cleanedNote ?? null : null,
  };
  if (to === "active") {
    patch.effectiveFrom = now;
    patch.effectiveTo = null;
  }
  if (to === "left" || to === "rejected" || to === "alumni") {
    patch.effectiveTo = now;
  }
  sqlite.transaction(() => {
    db.update(memberships)
      .set(patch)
      .where(eq(memberships.id, membershipId))
      .run();
    db.insert(membershipHistory)
      .values({
        id: nanoid(),
        membershipId,
        fromStatus: m.status,
        toStatus: to,
        actorId: user.id,
        note: cleanedNote ?? null,
      })
      .run();
    writeSensitiveAudit({
      actorId: user.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: membershipId,
      clubId: m.clubId,
      result: "allow",
      bypass,
      metadata: spec.metadata,
    });
  })();
  if (to === "active") {
    notifyUser({
      recipientId: m.memberId,
      clubId: m.clubId,
      type: "membership.approved",
      title: t("notify.approved"),
      payload: { membershipId },
    });
  } else if (to === "rejected") {
    notifyUser({
      recipientId: m.memberId,
      clubId: m.clubId,
      type: "membership.rejected",
      title: t("notify.rejected"),
      body: cleanedNote ?? undefined,
      payload: { membershipId },
    });
  }
}

export function kickMember(
  user: SessionUser,
  membershipId: string,
  note?: string,
) {
  const m = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!m) throw new AppError("NOT_FOUND", "Membership not found", 404);
  if (m.memberId === user.id) {
    throw new AppError("CANNOT_KICK_SELF", "Cannot kick yourself", 400);
  }
  const kickNote = (note ?? "").trim();
  if (kickNote.length < 8) {
    throw new AppError(
      "KICK_REASON_REQUIRED",
      "Kick reason required (min 8 characters)",
      422,
    );
  }
  const spec = {
    action: "membership.kick",
    resourceType: "membership",
    resourceId: membershipId,
    metadata: { from: m.status, to: "left" as const },
  };
  const { bypass } = requireSensitivePermission(
    user,
    m.clubId,
    "manage_members",
    spec,
  );
  assertCanDemoteOrKickOwner({
    position: m.position,
    status: m.status,
    activeOwnerCount: countActiveOwners(m.clubId),
  });
  try {
    assertMembershipTransition(m.status as MembershipStatus, "left");
  } catch {
    throw new AppError(
      "ILLEGAL_TRANSITION",
      `Cannot transition membership ${m.status} → left`,
      422,
    );
  }
  const now = new Date();
  sqlite.transaction(() => {
    db.update(memberships)
      .set({
        status: "left",
        updatedAt: now,
        effectiveTo: now,
      })
      .where(eq(memberships.id, membershipId))
      .run();
    db.insert(membershipHistory)
      .values({
        id: nanoid(),
        membershipId,
        fromStatus: m.status,
        toStatus: "left",
        actorId: user.id,
        note: kickNote,
      })
      .run();
    writeSensitiveAudit({
      actorId: user.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: membershipId,
      clubId: m.clubId,
      result: "allow",
      bypass,
      metadata: { ...spec.metadata, note: kickNote },
    });
  })();
  scrubMemberPiiAfterExit(m.memberId);
}

export function leaveClub(user: SessionUser, clubId?: string) {
  const primary = clubId ?? getPrimaryClub().id;
  const m = getMyMembership(primary, user.id);
  if (!m || m.status !== "active") {
    throw new AppError("NOT_MEMBER", "Not an active member", 400);
  }
  assertCanDemoteOrKickOwner({
    position: m.position,
    status: m.status,
    activeOwnerCount: countActiveOwners(m.clubId),
  });
  try {
    assertMembershipTransition(m.status as MembershipStatus, "left");
  } catch {
    throw new AppError("ILLEGAL_TRANSITION", "Cannot leave from this status", 422);
  }
  const now = new Date();
  sqlite.transaction(() => {
    db.update(memberships)
      .set({ status: "left", updatedAt: now, effectiveTo: now })
      .where(eq(memberships.id, m.id))
      .run();
    db.insert(membershipHistory)
      .values({
        id: nanoid(),
        membershipId: m.id,
        fromStatus: m.status,
        toStatus: "left",
        actorId: user.id,
        note: "self leave",
      })
      .run();
    writeSensitiveAudit({
      actorId: user.id,
      action: "membership.leave",
      resourceType: "membership",
      resourceId: m.id,
      clubId: m.clubId,
      result: "allow",
      bypass: false,
      metadata: { self: true },
    });
  })();
  scrubMemberPiiAfterExit(user.id);
  return { ok: true };
}

export function transferOwner(user: SessionUser, membershipId: string) {
  const target = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!target) throw new AppError("NOT_FOUND", "Membership not found", 404);
  if (target.status !== "active") {
    throw new AppError(
      "INVALID_TARGET",
      "Transfer target must be an active member",
      400,
    );
  }
  const club = getClubOrThrow(target.clubId);
  const spec = {
    action: "membership.transfer_owner",
    resourceType: "membership",
    resourceId: membershipId,
    metadata: { fromOwnerId: club.ownerId, toOwnerId: target.memberId },
  };
  const { bypass } = requireSensitivePermission(
    user,
    target.clubId,
    "manage_roles",
    spec,
  );
  const previous = getMyMembership(target.clubId, club.ownerId);
  if (!previous) {
    throw new AppError("NOT_FOUND", "Current owner membership not found", 404);
  }
  const now = new Date();
  sqlite.transaction(() => {
    db.update(memberships)
      .set({ position: "owner", updatedAt: now })
      .where(eq(memberships.id, target.id))
      .run();
    if (previous.id !== target.id) {
      db.update(memberships)
        .set({ position: "leader", updatedAt: now })
        .where(eq(memberships.id, previous.id))
        .run();
    }
    db.update(clubs)
      .set({ ownerId: target.memberId, updatedAt: now })
      .where(eq(clubs.id, target.clubId))
      .run();
    writeSensitiveAudit({
      actorId: user.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: membershipId,
      clubId: target.clubId,
      result: "allow",
      bypass,
      metadata: spec.metadata,
    });
  })();
  return { ownerId: target.memberId };
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
  const spec = {
    action: "membership.assign_position",
    resourceType: "membership",
    resourceId: membershipId,
    metadata: { from: m.position, to: position },
  };
  const { bypass } = requireSensitivePermission(
    user,
    m.clubId,
    "manage_roles",
    spec,
  );
  if (m.position === "owner" && position !== "owner") {
    assertCanDemoteOrKickOwner({
      position: m.position,
      status: m.status,
      activeOwnerCount: countActiveOwners(m.clubId),
    });
  }
  sqlite.transaction(() => {
    const patch: {
      position: Position;
      updatedAt: Date;
      teamId?: string | null;
    } = { position, updatedAt: new Date() };
    const canonical = defaultTeamNameForPosition(position);
    if (canonical) {
      const team = findTeamByNormalizedName(m.clubId, canonical);
      if (team) patch.teamId = team.id;
    }
    db.update(memberships)
      .set(patch)
      .where(eq(memberships.id, membershipId))
      .run();
    writeSensitiveAudit({
      actorId: user.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: membershipId,
      clubId: m.clubId,
      result: "allow",
      bypass,
      metadata: {
        ...spec.metadata,
        syncedTeamId: patch.teamId ?? null,
      },
    });
  })();
  notifyUser({
    recipientId: m.memberId,
    clubId: m.clubId,
    type: "membership.role_changed",
    title: t("notify.role_changed"),
    body: position,
    payload: { membershipId, position },
  });
}

function newInviteCode(): string {
  return nanoid(10).replace(/[_-]/g, "X").toUpperCase().slice(0, 8);
}

function peekInviteToken(clubId: string, code: string) {
  const row = db
    .select()
    .from(clubInviteTokens)
    .where(eq(clubInviteTokens.code, code))
    .all()[0];
  if (!row || row.clubId !== clubId) {
    throw new AppError("INVITE_INVALID", "Invite code not found", 404);
  }
  if (row.revokedAt) {
    throw new AppError("INVITE_REVOKED", "Invite code revoked", 410);
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    throw new AppError("INVITE_EXPIRED", "Invite code expired", 410);
  }
  if (row.maxUses != null && row.useCount >= row.maxUses) {
    throw new AppError("INVITE_EXHAUSTED", "Invite code used up", 410);
  }
  if (row.kind === "email" && row.email) {
    // email invites are single-recipient; redeemed by any logged-in user matching email later
  }
  return row;
}

/** CM-211 — club-wide invite link (30 days, unlimited uses until rotate). */
export function ensureInviteLink(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "manage_members");
  const existing = db
    .select()
    .from(clubInviteTokens)
    .where(
      and(eq(clubInviteTokens.clubId, clubId), eq(clubInviteTokens.kind, "link")),
    )
    .all()
    .find((r) => !r.revokedAt);
  if (
    existing &&
    (!existing.expiresAt || existing.expiresAt.getTime() > Date.now())
  ) {
    return {
      code: existing.code,
      expiresAt: existing.expiresAt,
      path: `/join?code=${existing.code}`,
    };
  }
  if (existing) {
    db.update(clubInviteTokens)
      .set({ revokedAt: new Date() })
      .where(eq(clubInviteTokens.id, existing.id))
      .run();
  }
  const code = newInviteCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const id = nanoid();
  db.insert(clubInviteTokens)
    .values({
      id,
      clubId,
      code,
      kind: "link",
      createdBy: user.id,
      expiresAt,
      maxUses: null,
      useCount: 0,
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "invite.link_create",
    objectType: "invite",
    objectId: id,
  });
  return { code, expiresAt, path: `/join?code=${code}` };
}

export function rotateInviteLink(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "manage_members");
  const links = db
    .select()
    .from(clubInviteTokens)
    .where(
      and(eq(clubInviteTokens.clubId, clubId), eq(clubInviteTokens.kind, "link")),
    )
    .all()
    .filter((r) => !r.revokedAt);
  for (const link of links) {
    db.update(clubInviteTokens)
      .set({ revokedAt: new Date() })
      .where(eq(clubInviteTokens.id, link.id))
      .run();
  }
  return ensureInviteLink(user, clubId);
}

/**
 * CM-211 — manual add by email (existing account → active member)
 * or email invite token when account does not exist yet.
 * `emailOrCode` may be email or MSSV matched against email local-part.
 */
export function inviteOrAddMember(
  user: SessionUser,
  clubId: string,
  input: {
    emailOrCode: string;
    position?: Position;
    teamId?: string | null;
  },
) {
  requireClubPermission(user, clubId, "manage_members");
  const raw = input.emailOrCode.trim().toLowerCase();
  if (raw.length < 3) {
    throw new AppError("VALIDATION", "Email or student code required", 422);
  }
  const position = (input.position ?? "member") as Position;
  if (!POSITIONS.includes(position) || position === "owner") {
    throw new AppError(
      "VALIDATION",
      "Cannot invite directly as owner — use transfer_owner",
      422,
    );
  }
  if (input.teamId) {
    const team = db
      .select()
      .from(teams)
      .where(eq(teams.id, input.teamId))
      .all()[0];
    if (!team || team.clubId !== clubId) {
      throw new AppError("NOT_FOUND", "Team not found", 404);
    }
  }

  const allMembers = db.select().from(members).all();
  const target =
    allMembers.find((m) => m.email.toLowerCase() === raw) ??
    allMembers.find((m) => m.email.toLowerCase().split("@")[0] === raw) ??
    allMembers.find((m) => m.email.toLowerCase().includes(raw));

  if (target) {
    const existing = getMyMembership(clubId, target.id);
    if (existing && ["pending", "active"].includes(existing.status)) {
      throw new AppError("ALREADY_MEMBER", "Already a member", 409);
    }
    const id = existing?.id ?? nanoid();
    const now = new Date();
    sqlite.transaction(() => {
      if (existing) {
        db.update(memberships)
          .set({
            status: "active",
            position,
            teamId: input.teamId ?? existing.teamId,
            effectiveFrom: now,
            effectiveTo: null,
            updatedAt: now,
          })
          .where(eq(memberships.id, existing.id))
          .run();
      } else {
        db.insert(memberships)
          .values({
            id,
            clubId,
            memberId: target.id,
            position,
            status: "active",
            teamId: input.teamId ?? null,
            effectiveFrom: now,
          })
          .run();
      }
      db.insert(membershipHistory)
        .values({
          id: nanoid(),
          membershipId: id,
          fromStatus: existing?.status ?? "none",
          toStatus: "active",
          actorId: user.id,
          note: "manual add by BĐH",
        })
        .run();
      writeSensitiveAudit({
        actorId: user.id,
        action: "membership.manual_add",
        resourceType: "membership",
        resourceId: id,
        clubId,
        result: "allow",
        bypass: false,
        metadata: { email: target.email, position },
      });
    })();
    incMetric("club.joins");
    notifyUser({
      recipientId: target.id,
      clubId,
      type: "membership.approved",
      title: t("notify.approved"),
      payload: { membershipId: id },
    });
    return { kind: "added" as const, membershipId: id, email: target.email };
  }

  // No account yet — create email invite token (redeem via /join?code=)
  const code = newInviteCode();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const id = nanoid();
  db.insert(clubInviteTokens)
    .values({
      id,
      clubId,
      code,
      kind: "email",
      email: raw.includes("@") ? raw : `${raw}@pending.pfc.invalid`,
      createdBy: user.id,
      expiresAt,
      maxUses: 1,
      useCount: 0,
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "invite.email_create",
    objectType: "invite",
    objectId: id,
  });
  return {
    kind: "invited" as const,
    code,
    expiresAt,
    path: `/join?code=${code}`,
    email: raw,
  };
}

export function listMembershipHistory(user: SessionUser, membershipId: string) {
  const m = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!m) throw new AppError("NOT_FOUND", "Membership not found", 404);
  requireClubPermission(user, m.clubId, "view_members");
  return db
    .select()
    .from(membershipHistory)
    .where(eq(membershipHistory.membershipId, membershipId))
    .orderBy(desc(membershipHistory.createdAt))
    .all();
}

/** ADR-005 / G1 — single club cannot be dissolved or lifecycle-mutated. */
export function transitionClubStatus(
  _user: SessionUser,
  _clubId: string,
  _to: "active" | "archived" | "disbanded",
): never {
  rejectClubTransition();
}

export function clubReport(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_reports");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();
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
      joinedThisMonth: memberRows.filter((m) => {
        const t0 = m.createdAt?.getTime?.() ?? 0;
        return t0 >= monthStartMs;
      }).length,
    },
    tasks: {
      total: taskRows.length,
      doneThisMonth: taskRows.filter((t) => {
        if (t.status !== "done") return false;
        const t0 = t.updatedAt?.getTime?.() ?? 0;
        return t0 >= monthStartMs;
      }).length,
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
    generatedAt: new Date().toISOString(),
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
