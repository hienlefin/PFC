import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sqlite, db } from "@/db";
import { migrateUp } from "@/db/migrate";
import {
  members,
  clubs,
  memberships,
  tasks,
  taskChecklistItems,
  documents,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import { requireClubPermission } from "@/lib/authz";
import * as clubSvc from "@/server/clubs";
import * as taskSvc from "@/server/tasks";
import * as ops from "@/server/ops";

function session(
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

function expectStatus(fn: () => unknown, status: number) {
  try {
    fn();
    throw new Error(`expected HTTP ${status}`);
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(status);
  }
}

function expect403(fn: () => unknown) {
  expectStatus(fn, 403);
}

function wipe() {
  sqlite.exec("PRAGMA foreign_keys = OFF");
  sqlite.exec("DROP TRIGGER IF EXISTS membership_history_no_update");
  sqlite.exec("DROP TRIGGER IF EXISTS membership_history_no_delete");
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
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS membership_history_no_update
    BEFORE UPDATE ON membership_history
    BEGIN
      SELECT RAISE(ABORT, 'membership_history is append-only');
    END;
    CREATE TRIGGER IF NOT EXISTS membership_history_no_delete
    BEFORE DELETE ON membership_history
    BEGIN
      SELECT RAISE(ABORT, 'membership_history is append-only');
    END;
  `);
  sqlite.exec("PRAGMA foreign_keys = ON");
}

type World = {
  alice: SessionUser;
  bob: SessionUser;
  outsider: SessionUser;
  clubX: string;
  clubY: string;
  membershipY: string;
  taskY: string;
  itemY: string;
  docY: string;
};

function seedWorld(): World {
  const hash = bcrypt.hashSync("test-pass", 4);
  const aliceId = nanoid();
  const bobId = nanoid();
  const outsiderId = nanoid();
  const clubX = nanoid();
  const clubY = nanoid();

  db.insert(members)
    .values([
      {
        id: aliceId,
        email: "alice@test.pfc",
        fullName: "Alice",
        passwordHash: hash,
        isSuperAdmin: false,
      },
      {
        id: bobId,
        email: "bob@test.pfc",
        fullName: "Bob",
        passwordHash: hash,
        isSuperAdmin: false,
      },
      {
        id: outsiderId,
        email: "out@test.pfc",
        fullName: "Outsider",
        passwordHash: hash,
        isSuperAdmin: false,
      },
    ])
    .run();

  db.insert(clubs)
    .values([
      {
        id: clubX,
        name: "Club X",
        slug: `club-x-${clubX.slice(0, 6)}`,
        visibility: "private",
        status: "active",
        ownerId: aliceId,
      },
      {
        id: clubY,
        name: "Club Y",
        slug: `club-y-${clubY.slice(0, 6)}`,
        visibility: "private",
        status: "active",
        ownerId: bobId,
      },
    ])
    .run();

  const membershipY = nanoid();
  db.insert(memberships)
    .values([
      {
        id: nanoid(),
        clubId: clubX,
        memberId: aliceId,
        position: "member",
        status: "active",
      },
      {
        id: membershipY,
        clubId: clubY,
        memberId: bobId,
        position: "owner",
        status: "active",
      },
    ])
    .run();

  const taskY = nanoid();
  db.insert(tasks)
    .values({
      id: taskY,
      clubId: clubY,
      title: "Y task",
      assignerId: bobId,
      assigneeId: bobId,
      status: "todo",
    })
    .run();

  const itemY = nanoid();
  db.insert(taskChecklistItems)
    .values({ id: itemY, taskId: taskY, title: "item", done: false, sortOrder: 0 })
    .run();

  const docY = nanoid();
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
    alice: session(aliceId, { email: "alice@test.pfc", fullName: "Alice" }),
    bob: session(bobId, { email: "bob@test.pfc", fullName: "Bob" }),
    outsider: session(outsiderId, { email: "out@test.pfc", fullName: "Outsider" }),
    clubX,
    clubY,
    membershipY,
    taskY,
    itemY,
    docY,
  };
}

describe("CM-104 / CM-216 object-level authorization", () => {
  beforeEach(() => {
    migrateUp();
    wipe();
  });

  it("horizontal: member of club X cannot read/write club Y resources (403)", () => {
    const w = seedWorld();

    expect403(() => clubSvc.assertCanViewClub(w.alice, w.clubY));
    expect403(() => clubSvc.listMembers(w.alice, w.clubY));
    expect403(() => clubSvc.listTeams(w.alice, w.clubY));
    expect403(() => clubSvc.clubReport(w.alice, w.clubY));
    expect403(() => clubSvc.recentAudit(w.alice, w.clubY));
    expect403(() => taskSvc.listTasks(w.alice, w.clubY));
    expect403(() => ops.listActivities(w.alice, w.clubY));
    expect403(() => ops.listDocuments(w.alice, w.clubY));
    expect403(() => ops.listLinkedEvents(w.alice, w.clubY));

    expect403(() =>
      clubSvc.createTeam(w.alice, w.clubY, { name: "intrude" }),
    );
    expect403(() =>
      taskSvc.createTask(w.alice, w.clubY, { title: "intrude" }),
    );
    expect403(() => taskSvc.transitionTask(w.alice, w.taskY, "in_progress"));
    expect403(() => taskSvc.addChecklistItem(w.alice, w.taskY, "x"));
    expect403(() => taskSvc.toggleChecklistItem(w.alice, w.itemY, true));
    expect403(() =>
      clubSvc.transitionMembership(w.alice, w.membershipY, "inactive"),
    );
    expect403(() => clubSvc.assignPosition(w.alice, w.membershipY, "member"));
    expect403(() =>
      ops.createActivity(w.alice, w.clubY, { title: "intrude" }),
    );
    expect403(() =>
      ops.registerDocumentMeta(w.alice, w.clubY, {
        title: "x",
        storageKey: "k",
        mimeType: "text/plain",
        sizeBytes: 1,
      }),
    );
    expect403(() => ops.softDeleteDocument(w.alice, w.docY));
    expect403(() => ops.linkSharedEvent(w.alice, w.clubY, "evt_other"));
  });

  it("vertical: member role cannot call leader/owner-only actions on own club (403)", () => {
    const w = seedWorld();

    expect(() => taskSvc.listTasks(w.alice, w.clubX)).not.toThrow();
    expect(() => clubSvc.listMembers(w.alice, w.clubX)).not.toThrow();

    expect403(() =>
      taskSvc.createTask(w.alice, w.clubX, { title: "need leader" }),
    );
    expect403(() =>
      clubSvc.createTeam(w.alice, w.clubX, { name: "need leader" }),
    );
    expect403(() =>
      ops.createActivity(w.alice, w.clubX, { title: "need leader" }),
    );
    expect403(() =>
      ops.registerDocumentMeta(w.alice, w.clubX, {
        title: "x",
        storageKey: "k",
        mimeType: "text/plain",
        sizeBytes: 1,
      }),
    );
    expect403(() => ops.linkSharedEvent(w.alice, w.clubX, "evt_x"));
    expect403(() => clubSvc.clubReport(w.alice, w.clubX));
    expect403(() => clubSvc.recentAudit(w.alice, w.clubX));
  });

  it("ADR-003: private club — non-member gets 403 on content (not a silent 200)", () => {
    const w = seedWorld();
    expect403(() => clubSvc.assertCanViewClub(w.outsider, w.clubX));
    expect403(() => taskSvc.listTasks(w.outsider, w.clubX));
    expect403(() => clubSvc.listMembers(w.outsider, w.clubX));
    expect403(() => requireClubPermission(w.outsider, w.clubX, "view_club"));
  });

  it("assignee on another club cannot skip membership via task_transition", () => {
    const w = seedWorld();
    db.update(tasks)
      .set({ assigneeId: w.alice.id, status: "in_progress" })
      .where(eq(tasks.id, w.taskY))
      .run();
    expect403(() => taskSvc.transitionTask(w.alice, w.taskY, "review"));
  });
});
