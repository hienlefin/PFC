import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { tasks, taskChecklistItems } from "@/db/schema";
import {
  assertTaskTransition,
  KANBAN_COLUMNS,
  type TaskStatus,
} from "@/domain/task-fsm";
import { AppError } from "@/lib/errors";
import { requireClubPermission, requireSensitivePermission } from "@/lib/authz";
import { writeAudit, writeSensitiveAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";

export function listTasks(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_club");
  return db.select().from(tasks).where(eq(tasks.clubId, clubId)).all();
}

export function kanbanBoard(user: SessionUser, clubId: string) {
  const rows = listTasks(user, clubId);
  return Object.fromEntries(
    KANBAN_COLUMNS.map((col) => [col, rows.filter((t) => t.status === col)]),
  );
}

export function timelineTasks(user: SessionUser, clubId: string) {
  return listTasks(user, clubId)
    .filter((t) => t.deadline)
    .sort(
      (a, b) =>
        (a.deadline?.getTime() ?? 0) - (b.deadline?.getTime() ?? 0),
    );
}

export function createTask(
  user: SessionUser,
  clubId: string,
  input: {
    title: string;
    description?: string;
    assigneeId?: string;
    priority?: string;
    deadline?: Date | null;
  },
) {
  requireClubPermission(user, clubId, "manage_tasks");
  const id = nanoid();
  db.insert(tasks)
    .values({
      id,
      clubId,
      title: input.title,
      description: input.description ?? "",
      status: "backlog",
      priority: input.priority ?? "medium",
      assigneeId: input.assigneeId ?? null,
      assignerId: user.id,
      deadline: input.deadline ?? null,
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "task.create",
    objectType: "task",
    objectId: id,
  });
  return id;
}

export function transitionTask(
  user: SessionUser,
  taskId: string,
  to: TaskStatus,
  proofOfWork?: string,
) {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
  if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);

  const spec = {
    action: "task.transition",
    resourceType: "task",
    resourceId: taskId,
    metadata: { from: task.status, to },
  };

  // Object-level: always membership on the task's club first (no assignee skip).
  const first = requireSensitivePermission(user, task.clubId, "view_club", spec);

  const from = task.status as TaskStatus;
  assertTaskTransition(from, to);

  const isAssignee = task.assigneeId === user.id;
  let bypass = first.bypass;
  if (to === "done" || to === "cancelled" || (from === "review" && to === "in_progress")) {
    bypass = requireSensitivePermission(user, task.clubId, "review_tasks", spec).bypass;
  } else if (to === "review") {
    if (!isAssignee) {
      bypass = requireSensitivePermission(user, task.clubId, "manage_tasks", spec).bypass;
    }
  } else {
    bypass = requireSensitivePermission(user, task.clubId, "manage_tasks", spec).bypass;
  }

  sqlite.transaction(() => {
    db.update(tasks)
      .set({
        status: to,
        proofOfWork: proofOfWork ?? task.proofOfWork,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .run();

    writeSensitiveAudit({
      actorId: user.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: taskId,
      clubId: task.clubId,
      result: "allow",
      bypass,
      metadata: spec.metadata,
    });
  })();
}

export function addChecklistItem(
  user: SessionUser,
  taskId: string,
  title: string,
) {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
  if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
  requireClubPermission(user, task.clubId, "manage_tasks");
  const id = nanoid();
  db.insert(taskChecklistItems)
    .values({ id, taskId, title, done: false, sortOrder: 0 })
    .run();
  return id;
}

export function toggleChecklistItem(
  user: SessionUser,
  itemId: string,
  done: boolean,
) {
  const item = db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.id, itemId))
    .all()[0];
  if (!item) throw new AppError("NOT_FOUND", "Checklist item not found", 404);
  const task = db.select().from(tasks).where(eq(tasks.id, item.taskId)).all()[0];
  if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
  requireClubPermission(user, task.clubId, "view_club");
  db.update(taskChecklistItems)
    .set({ done })
    .where(eq(taskChecklistItems.id, itemId))
    .run();
}

export function listChecklist(taskId: string) {
  return db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, taskId))
    .all();
}
