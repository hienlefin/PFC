import { beforeEach, describe, expect, it } from "vitest";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { db, sqlite } from "@/db";
import { migrateUp } from "@/db/migrate";
import {
  members,
  clubs,
  memberships,
  tasks,
  documents,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import { listAuditByAction } from "@/lib/audit";
import { requireClubPermission } from "@/lib/authz";
import * as clubSvc from "@/server/clubs";
import * as taskSvc from "@/server/tasks";
import * as ops from "@/server/ops";
import { eq } from "drizzle-orm";

function actor(
  id: string,
  extra?: Partial<SessionUser>,
): SessionUser {
  return {
    id,
    email: `${id}@test.pfc`,
    fullName: id,
    isSuperAdmin: false,
    ...extra,
  };
}

function wipe() {
  sqlite.exec("PRAGMA foreign_keys = OFF");
  for (const table of [
    "task_checklist_items",
    "tasks",
    "membership_history",
    "memberships",
    "activity_participants",
    "activities",
    "documents",
    "club_event_links",
    "audit_events",
    "idempotency_keys",
    "teams",
    "clubs",
    "members",
  ]) {
    sqlite.exec(`DELETE FROM ${table}`);
  }
  sqlite.exec("PRAGMA foreign_keys = ON");
}

function seed() {
  const hash = bcrypt.hashSync("test-pass", 4);
  const aliceId = nanoid();
  const bobId = nanoid();
  const adminId = nanoid();
  const clubY = nanoid();
  const pendingId = nanoid();
  const taskY = nanoid();
  const docY = nanoid();

  db.insert(members)
    .values([
      {
        id: aliceId,
        email: "alice-audit@test.pfc",
        fullName: "Alice",
        passwordHash: hash,
        isSuperAdmin: false,
      },
      {
        id: bobId,
        email: "bob-audit@test.pfc",
        fullName: "Bob",
        passwordHash: hash,
        isSuperAdmin: false,
      },
      {
        id: adminId,
        email: "admin-audit@test.pfc",
        fullName: "Admin",
        passwordHash: hash,
        isSuperAdmin: true,
      },
    ])
    .run();

  db.insert(clubs)
    .values({
      id: clubY,
      name: "Club Y",
      slug: `club-y-audit-${clubY.slice(0, 6)}`,
      visibility: "private",
      status: "active",
      ownerId: bobId,
    })
    .run();

  db.insert(memberships)
    .values([
      {
        id: nanoid(),
        clubId: clubY,
        memberId: bobId,
        position: "owner",
        status: "active",
      },
      {
        id: pendingId,
        clubId: clubY,
        memberId: aliceId,
        position: "member",
        status: "pending",
      },
    ])
    .run();

  db.insert(tasks)
    .values({
      id: taskY,
      clubId: clubY,
      title: "Y task",
      assignerId: bobId,
      status: "todo",
    })
    .run();

  db.insert(documents)
    .values({
      id: docY,
      clubId: clubY,
      title: "secret.pdf",
      storageKey: "local/y/secret.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      uploadedBy: bobId,
    })
    .run();

  return {
    alice: actor(aliceId, { email: "alice-audit@test.pfc" }),
    bob: actor(bobId, { email: "bob-audit@test.pfc" }),
    admin: actor(adminId, {
      email: "admin-audit@test.pfc",
      isSuperAdmin: true,
    }),
    clubY,
    pendingId,
    taskY,
    docY,
    bobMembershipId: db
      .select()
      .from(memberships)
      .where(eq(memberships.memberId, bobId))
      .all()[0].id,
  };
}

function expect403(fn: () => unknown) {
  try {
    fn();
    throw new Error("expected 403");
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(403);
  }
}

function parseMeta(row: { metaJson: string | null }) {
  return row.metaJson ? (JSON.parse(row.metaJson) as Record<string, unknown>) : {};
}

describe("CM-106 sensitive audit", () => {
  beforeEach(() => {
    migrateUp();
    wipe();
  });

  it("membership.transition allow/deny each write exactly one record", () => {
    const w = seed();
    expect403(() =>
      clubSvc.transitionMembership(w.alice, w.pendingId, "active"),
    );
    const denied = listAuditByAction("membership.transition");
    expect(denied).toHaveLength(1);
    expect(denied[0].result).toBe("deny");
    expect(denied[0].actorId).toBe(w.alice.id);
    expect(denied[0].objectId).toBe(w.pendingId);
    expect(denied[0].bypass).toBe(false);

    sqlite.exec("DELETE FROM audit_events");
    clubSvc.transitionMembership(w.bob, w.pendingId, "active");
    const allowed = listAuditByAction("membership.transition");
    expect(allowed).toHaveLength(1);
    expect(allowed[0].result).toBe("allow");
    expect(parseMeta(allowed[0]).from).toBe("pending");
    expect(parseMeta(allowed[0]).to).toBe("active");
  });

  it("assign_position records old/new role", () => {
    const w = seed();
    expect403(() =>
      clubSvc.assignPosition(w.alice, w.bobMembershipId, "member"),
    );
    expect(listAuditByAction("membership.assign_position")).toHaveLength(1);
    expect(listAuditByAction("membership.assign_position")[0].result).toBe(
      "deny",
    );

    sqlite.exec("DELETE FROM audit_events");
    clubSvc.assignPosition(w.bob, w.pendingId, "ban_su_kien");
    const rows = listAuditByAction("membership.assign_position");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("allow");
    expect(parseMeta(rows[0]).from).toBe("member");
    expect(parseMeta(rows[0]).to).toBe("ban_su_kien");
  });

  it("task.transition allow/deny", () => {
    const w = seed();
    expect403(() => taskSvc.transitionTask(w.alice, w.taskY, "in_progress"));
    expect(listAuditByAction("task.transition")).toHaveLength(1);
    expect(listAuditByAction("task.transition")[0].result).toBe("deny");

    sqlite.exec("DELETE FROM audit_events");
    taskSvc.transitionTask(w.bob, w.taskY, "in_progress");
    const rows = listAuditByAction("task.transition");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("allow");
    expect(parseMeta(rows[0]).from).toBe("todo");
    expect(parseMeta(rows[0]).to).toBe("in_progress");
  });

  it("club.transition allow/deny", () => {
    const w = seed();
    expect403(() => clubSvc.transitionClubStatus(w.alice, w.clubY, "archived"));
    expect(listAuditByAction("club.transition")).toHaveLength(1);
    expect(listAuditByAction("club.transition")[0].result).toBe("deny");

    sqlite.exec("DELETE FROM audit_events");
    clubSvc.transitionClubStatus(w.bob, w.clubY, "archived");
    const rows = listAuditByAction("club.transition");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("allow");
    expect(parseMeta(rows[0]).to).toBe("archived");
  });

  it("document.soft_delete allow/deny", () => {
    const w = seed();
    expect403(() => ops.softDeleteDocument(w.alice, w.docY));
    expect(listAuditByAction("document.soft_delete")).toHaveLength(1);
    expect(listAuditByAction("document.soft_delete")[0].result).toBe("deny");

    sqlite.exec("DELETE FROM audit_events");
    ops.softDeleteDocument(w.bob, w.docY);
    const rows = listAuditByAction("document.soft_delete");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("allow");
    expect(rows[0].objectId).toBe(w.docY);
  });

  it("SuperAdmin requireClubPermission bypass always audits bypass=true", () => {
    const w = seed();
    requireClubPermission(w.admin, w.clubY, "manage_club");
    const rows = listAuditByAction("rbac.bypass");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].bypass).toBe(true);
    expect(rows[0].result).toBe("allow");
    expect(rows[0].actorId).toBe(w.admin.id);
    expect(parseMeta(rows[0]).bypass).toBe(true);
    expect(parseMeta(rows[0]).permission).toBe("manage_club");
  });

  it("SuperAdmin sensitive action allow record has bypass=true", () => {
    const w = seed();
    clubSvc.assignPosition(w.admin, w.pendingId, "leader");
    const rows = listAuditByAction("membership.assign_position");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe("allow");
    expect(rows[0].bypass).toBe(true);
    expect(parseMeta(rows[0]).bypass).toBe(true);
  });
});
