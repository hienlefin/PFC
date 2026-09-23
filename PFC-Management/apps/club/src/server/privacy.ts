import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import {
  members,
  membershipHistory,
  memberships,
  notifications,
  notificationPreferences,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { requireSensitivePermission } from "@/lib/authz";
import { writeSensitiveAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";

/**
 * CM-608 — export membership PII for a privacy request.
 * Subject may export self; manage_members / super-admin may export others.
 */
export function exportMembershipPii(actor: SessionUser, membershipId: string) {
  const m = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!m) throw new AppError("NOT_FOUND", "Membership not found", 404);

  const isSelf = m.memberId === actor.id;
  if (!isSelf) {
    requireSensitivePermission(actor, m.clubId, "manage_members", {
      action: "privacy.export",
      resourceType: "membership",
      resourceId: membershipId,
    });
  }

  const member = db
    .select()
    .from(members)
    .where(eq(members.id, m.memberId))
    .all()[0];
  if (!member) throw new AppError("NOT_FOUND", "Member not found", 404);

  const history = db
    .select()
    .from(membershipHistory)
    .where(eq(membershipHistory.membershipId, membershipId))
    .all();

  return {
    exportedAt: new Date().toISOString(),
    classification: "confidential" as const,
    member: {
      id: member.id,
      email: member.email,
      fullName: member.fullName,
      createdAt: member.createdAt,
    },
    membership: {
      id: m.id,
      clubId: m.clubId,
      position: m.position,
      status: m.status,
      joinReason: m.joinReason,
      rejectReason: m.rejectReason,
      effectiveFrom: m.effectiveFrom,
      effectiveTo: m.effectiveTo,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    },
    history: history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorId: h.actorId,
      note: h.note,
      createdAt: h.createdAt,
    })),
  };
}

/**
 * CM-608 — anonymize membership PII; keep append-only history rows.
 * Clears join/reject reasons, marks membership left when allowed,
 * anonymizes member profile if no other active memberships.
 */
export function anonymizeMembershipPii(
  actor: SessionUser,
  membershipId: string,
  note?: string,
) {
  const m = db
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .all()[0];
  if (!m) throw new AppError("NOT_FOUND", "Membership not found", 404);

  const isSelf = m.memberId === actor.id;
  const spec = {
    action: "privacy.anonymize",
    resourceType: "membership",
    resourceId: membershipId,
    metadata: { note: note ?? null },
  };
  let bypass = false;
  if (!isSelf) {
    bypass = requireSensitivePermission(actor, m.clubId, "manage_members", spec)
      .bypass;
  }

  const now = new Date();
  const anonEmail = `deleted+${m.memberId.slice(0, 8)}@pfc.invalid`;
  const anonName = "Deleted Member";
  const shouldLeave = m.status === "active" || m.status === "pending";

  sqlite.transaction(() => {
    db.update(memberships)
      .set({
        status: shouldLeave ? "left" : m.status,
        joinReason: null,
        rejectReason: null,
        effectiveTo: now,
        updatedAt: now,
      })
      .where(eq(memberships.id, membershipId))
      .run();

    if (shouldLeave) {
      db.insert(membershipHistory)
        .values({
          id: nanoid(),
          membershipId,
          fromStatus: m.status,
          toStatus: "left",
          actorId: actor.id,
          note: note?.trim() || "privacy anonymize",
        })
        .run();
    }

    const otherActive = db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.memberId, m.memberId),
          eq(memberships.status, "active"),
        ),
      )
      .all()
      .filter((row) => row.id !== membershipId);

    if (otherActive.length === 0) {
      db.update(members)
        .set({
          email: anonEmail,
          fullName: anonName,
          passwordHash: "!",
        })
        .where(eq(members.id, m.memberId))
        .run();
      db.delete(notificationPreferences)
        .where(eq(notificationPreferences.memberId, m.memberId))
        .run();
      db.delete(notifications)
        .where(eq(notifications.recipientId, m.memberId))
        .run();
    }

    writeSensitiveAudit({
      actorId: actor.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: membershipId,
      clubId: m.clubId,
      result: "allow",
      bypass,
      metadata: spec.metadata,
    });
  })();

  return { membershipId, anonymized: true };
}

/**
 * After kick / leave — scrub profile PII when member has no other active
 * memberships. Keeps membership + task history rows intact for reports.
 */
export function scrubMemberPiiAfterExit(memberId: string): boolean {
  const otherActive = db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.memberId, memberId), eq(memberships.status, "active")),
    )
    .all();
  if (otherActive.length > 0) return false;

  const anonEmail = `deleted+${memberId.slice(0, 8)}@pfc.invalid`;
  db.update(members)
    .set({
      email: anonEmail,
      fullName: "Deleted Member",
      passwordHash: "!",
    })
    .where(eq(members.id, memberId))
    .run();
  db.delete(notificationPreferences)
    .where(eq(notificationPreferences.memberId, memberId))
    .run();
  db.delete(notifications)
    .where(eq(notifications.recipientId, memberId))
    .run();
  return true;
}
