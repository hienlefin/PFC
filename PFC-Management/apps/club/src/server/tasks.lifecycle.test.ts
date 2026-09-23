import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { members } from "@/db/schema";
import { migrateUp } from "@/db/migrate";
import { migrateDown } from "@/db/migrate-meta";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import * as clubs from "@/server/clubs";
import * as tasks from "@/server/tasks";

function asUser(row: {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
}): SessionUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    isSuperAdmin: row.isSuperAdmin,
  };
}

function insertUser(email: string, superAdmin = false) {
  const id = nanoid();
  db.insert(members)
    .values({
      id,
      email,
      fullName: email,
      passwordHash: bcrypt.hashSync("PFC123!", 4),
      isSuperAdmin: superAdmin,
    })
    .run();
  return asUser({
    id,
    email,
    fullName: email,
    isSuperAdmin: superAdmin,
  });
}

function openClub(owner: SessionUser) {
  return clubs.createClub(owner, { name: `Club ${nanoid(4)}`, visibility: "open" });
}

function joinMember(ownerClubId: string, email: string) {
  const user = insertUser(email);
  clubs.requestJoin(user, ownerClubId);
  return user;
}

const PROOF = {
  storageKey: "local/club/pow.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
};

function walkToReview(
  actor: SessionUser,
  taskId: string,
  assignee: SessionUser,
) {
  tasks.transitionTask(assignee, taskId, "todo");
  tasks.transitionTask(assignee, taskId, "in_progress");
  tasks.attachProofOfWork(assignee, taskId, PROOF);
  tasks.transitionTask(actor, taskId, "review");
}

describe("P5 task lifecycle", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
  });

  it("FSM: in_progress → review → done, and illegal skip is 422", () => {
    const owner = insertUser("owner@pfc.vn");
    const club = openClub(owner);
    const member = joinMember(club.id, "assignee@pfc.vn");
    const taskId = tasks.createTask(owner, club.id, {
      title: "Write outline",
      assigneeId: member.id,
    });

    expect(() => tasks.transitionTask(owner, taskId, "done")).toThrow(AppError);
    try {
      tasks.transitionTask(owner, taskId, "in_progress");
    } catch (err) {
      const e = err as AppError;
      expect(e.code).toBe("ILLEGAL_TRANSITION");
      expect(e.status).toBe(422);
    }

    walkToReview(member, taskId, member);
    const reviewed = tasks.getTaskDetail(owner, taskId);
    expect(reviewed.task.status).toBe("review");
    expect(reviewed.task.hasProof).toBe(true);
    expect(reviewed.task).not.toHaveProperty("proofOfWork");

    const result = tasks.reviewTask(owner, taskId, "approve");
    expect(result.to).toBe("done");
    expect(tasks.getTaskDetail(owner, taskId).task.status).toBe("done");
  });

  it("leader review: request_changes and reject with reason", () => {
    const owner = insertUser("lead@pfc.vn");
    const club = openClub(owner);
    const member = joinMember(club.id, "m1@pfc.vn");
    const taskId = tasks.createTask(owner, club.id, {
      title: "Draft post",
      assigneeId: member.id,
    });
    walkToReview(member, taskId, member);

    expect(() =>
      tasks.reviewTask(owner, taskId, "request_changes", "no"),
    ).toThrow(AppError);
    try {
      tasks.reviewTask(owner, taskId, "request_changes", "no");
    } catch (err) {
      expect((err as AppError).code).toBe("REVIEW_REASON_REQUIRED");
      expect((err as AppError).status).toBe(422);
    }

    tasks.reviewTask(owner, taskId, "request_changes", "Need more sources cited");
    expect(tasks.getTaskDetail(owner, taskId).task.status).toBe("in_progress");

    tasks.transitionTask(member, taskId, "review");
    tasks.reviewTask(owner, taskId, "reject", "Out of club scope entirely");
    expect(tasks.getTaskDetail(owner, taskId).task.status).toBe("cancelled");
  });

  it("member cannot review or cancel; cancel requires manage_tasks", () => {
    const owner = insertUser("own2@pfc.vn");
    const club = openClub(owner);
    const member = joinMember(club.id, "plain@pfc.vn");
    const taskId = tasks.createTask(owner, club.id, {
      title: "Member task",
      assigneeId: member.id,
    });
    walkToReview(member, taskId, member);

    expect(() => tasks.reviewTask(member, taskId, "approve")).toThrow(AppError);
    try {
      tasks.reviewTask(member, taskId, "approve");
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
    expect(() => tasks.cancelTask(member, taskId)).toThrow(AppError);

    tasks.cancelTask(owner, taskId);
    expect(tasks.getTaskDetail(owner, taskId).task.status).toBe("cancelled");
  });

  it("submit to review requires proof-of-work", () => {
    const owner = insertUser("own3@pfc.vn");
    const club = openClub(owner);
    const member = joinMember(club.id, "a3@pfc.vn");
    const taskId = tasks.createTask(owner, club.id, {
      title: "Need proof",
      assigneeId: member.id,
    });
    tasks.transitionTask(member, taskId, "todo");
    tasks.transitionTask(member, taskId, "in_progress");
    expect(() => tasks.transitionTask(member, taskId, "review")).toThrow(
      AppError,
    );
    tasks.attachProofOfWork(member, taskId, PROOF);
    tasks.transitionTask(member, taskId, "review");
    const token = tasks.getTaskDetail(owner, taskId).task.proofDownloadToken;
    expect(token).toBeTruthy();
  });

  it("checklist CRUD + integrity (wrong task / wrong club → 403)", () => {
    const ownerA = insertUser("oa@pfc.vn");
    const clubA = openClub(ownerA);
    const ownerB = insertUser("ob@pfc.vn");
    const clubB = openClub(ownerB);
    const taskA = tasks.createTask(ownerA, clubA.id, { title: "A work" });
    const taskB = tasks.createTask(ownerB, clubB.id, { title: "B work" });

    expect(() =>
      tasks.addChecklistItem(ownerA, taskA, "Outline", { clubId: clubB.id }),
    ).toThrow(AppError);

    const itemA = tasks.addChecklistItem(ownerA, taskA, "Outline");
    const itemB = tasks.addChecklistItem(ownerB, taskB, "Secret item");

    tasks.updateChecklistItem(ownerA, itemA, { title: "Outline v2", done: true });
    const listed = tasks.listChecklist(ownerA, taskA);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.title).toBe("Outline v2");
    expect(listed[0]?.done).toBe(true);

    expect(() =>
      tasks.toggleChecklistItem(ownerA, itemB, true, {
        taskId: taskA,
        clubId: clubA.id,
      }),
    ).toThrow(AppError);

    try {
      tasks.deleteChecklistItem(ownerA, itemB, { clubId: clubA.id });
    } catch (err) {
      expect((err as AppError).code).toBe("FORBIDDEN");
      expect((err as AppError).status).toBe(403);
    }

    tasks.deleteChecklistItem(ownerA, itemA);
    expect(tasks.listChecklist(ownerA, taskA)).toHaveLength(0);
  });

  it("Kanban persists sortOrder and concurrent move is 409", () => {
    const owner = insertUser("kanban@pfc.vn");
    const club = openClub(owner);
    const t1 = tasks.createTask(owner, club.id, { title: "First" });
    const t2 = tasks.createTask(owner, club.id, { title: "Second" });
    const board = tasks.kanbanBoard(owner, club.id);
    expect(board.backlog.map((t) => t.id)).toEqual([t1, t2]);

    tasks.reorderKanban(owner, t2, { status: "backlog", sortOrder: -1 });
    const again = tasks.kanbanBoard(owner, club.id);
    expect(again.backlog[0]?.id).toBe(t2);

    const detail = tasks.getTaskDetail(owner, t1);
    const stamp = new Date(detail.task.updatedAt).getTime();
    tasks.reorderKanban(owner, t1, {
      status: "backlog",
      sortOrder: 99,
      expectedUpdatedAt: stamp,
    });
    expect(() =>
      tasks.reorderKanban(owner, t1, {
        status: "backlog",
        sortOrder: 3,
        expectedUpdatedAt: stamp,
      }),
    ).toThrow(AppError);
  });

  it("Timeline/Gantt range query by deadline", () => {
    const owner = insertUser("gantt@pfc.vn");
    const club = openClub(owner);
    const d1 = new Date("2026-01-01T00:00:00Z");
    const d2 = new Date("2026-06-01T00:00:00Z");
    const d3 = new Date("2026-12-01T00:00:00Z");
    tasks.createTask(owner, club.id, { title: "Jan", deadline: d1 });
    const mid = tasks.createTask(owner, club.id, { title: "Jun", deadline: d2 });
    tasks.createTask(owner, club.id, { title: "Dec", deadline: d3 });
    tasks.createTask(owner, club.id, { title: "No date" });

    const range = tasks.timelineTasks(owner, club.id, {
      from: new Date("2026-03-01T00:00:00Z"),
      to: new Date("2026-09-01T00:00:00Z"),
    });
    expect(range.map((t) => t.id)).toEqual([mid]);
    expect(range[0]?.end).toBeTruthy();
    expect(range[0]?.start).toBeTruthy();
  });

  it("filters: assignee, priority, overdue", () => {
    const owner = insertUser("flt@pfc.vn");
    const club = openClub(owner);
    const member = joinMember(club.id, "asg@pfc.vn");
    tasks.createTask(owner, club.id, {
      title: "Overdue high",
      assigneeId: member.id,
      priority: "high",
      deadline: new Date(Date.now() - 86400000),
    });
    tasks.createTask(owner, club.id, {
      title: "Future low",
      priority: "low",
      deadline: new Date(Date.now() + 86400000),
    });
    const overdue = tasks.listTasks(owner, club.id, { overdue: true });
    expect(overdue).toHaveLength(1);
    expect(overdue[0]?.title).toBe("Overdue high");
    const byAssignee = tasks.listTasks(owner, club.id, { assigneeId: member.id });
    expect(byAssignee).toHaveLength(1);
    const high = tasks.listTasks(owner, club.id, { priority: "high" });
    expect(high).toHaveLength(1);
  });

  it("IDOR: leader of club A cannot review club B task", () => {
    const ownerA = insertUser("ida@pfc.vn");
    const clubA = clubs.createClub(ownerA, {
      name: "Private A",
      visibility: "private",
    });
    const ownerB = insertUser("idb@pfc.vn");
    const clubB = clubs.createClub(ownerB, {
      name: "Private B",
      visibility: "private",
    });
    const memberB = insertUser("mb@pfc.vn");
    clubs.requestJoin(memberB, clubB.id, "I want to learn personal finance");
    const pending = clubs.listMembers(ownerB, clubB.id).find((m) => m.memberId === memberB.id);
    clubs.transitionMembership(ownerB, pending!.id, "active");

    const taskB = tasks.createTask(ownerB, clubB.id, {
      title: "Secret B",
      assigneeId: memberB.id,
    });
    walkToReview(memberB, taskB, memberB);

    expect(() => tasks.reviewTask(ownerA, taskB, "approve")).toThrow(AppError);
    try {
      tasks.getTaskDetail(ownerA, taskB);
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
    expect(clubA.id).not.toBe(clubB.id);
  });

  it("private leak: non-member cannot list tasks (403)", () => {
    const owner = insertUser("priv@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Hidden",
      visibility: "private",
    });
    tasks.createTask(owner, club.id, { title: "Internal only" });
    const stranger = insertUser("out@pfc.vn");

    expect(() => clubs.assertCanViewClub(stranger, club.id)).toThrow(/Private club/);
    try {
      tasks.listTasks(stranger, club.id);
    } catch (err) {
      const e = err as AppError;
      expect(e.status).toBe(403);
      expect(e.code).toBe("FORBIDDEN");
    }
  });
});
