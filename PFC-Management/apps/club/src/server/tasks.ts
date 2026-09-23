import { nanoid } from "nanoid";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, sqlite } from "@/db";
import {
  tasks,
  taskChecklistItems,
  taskComments,
  members,
  memberships,
  teams,
  activities,
  auditEvents,
  clubs,
} from "@/db/schema";
import { normalizeTeamName } from "@/domain/team-policy";
import { KANBAN_COLUMNS, type TaskStatus } from "@/domain/task-fsm";
import {
  assertChecklistBelongsToTask,
  assertKnownTaskStatus,
  assertLegalTaskTransition,
  assertOptimisticTaskLock,
  assertProofOfWorkUpload,
  assertProofPresentForReview,
  assertReviewDecision,
  assertReviewReason,
  assertTaskPriority,
  assertTaskTitle,
  reviewTargetStatus,
} from "@/domain/task-policy";
import type { Position } from "@/domain/permissions";
import { AppError } from "@/lib/errors";
import {
  isActiveMember,
  requireClubPermission,
  requireSensitivePermission,
  memberPermissions,
} from "@/lib/authz";
import { assertResourceInClub } from "@/lib/access";
import { writeAudit, writeSensitiveAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import { signStorageKey } from "@/platform/storage";
import { notifyUser } from "@/platform/notify";
import { t } from "@/i18n/messages";
import { incMetric } from "@/platform/metrics";

type TaskRow = typeof tasks.$inferSelect;
type ChecklistRow = typeof taskChecklistItems.$inferSelect;

export type TaskQuery = {
  assigneeId?: string;
  teamId?: string;
  priority?: string;
  status?: string;
  overdue?: boolean;
  from?: Date;
  to?: Date;
  /** Skip role-based visibility narrowing (internal). */
  skipScope?: boolean;
};

export type TaskScope = {
  position: Position | null;
  teamId: string | null;
  /** owner / leader — may filter any department */
  canFilterAllTeams: boolean;
  /** ban_* — forced to own team */
  forcedTeamId: string | null;
  /** member without manage_tasks — only assigned work */
  assigneeOnly: boolean;
  canManageTasks: boolean;
};

export type PublicTask = Omit<TaskRow, "proofOfWork"> & {
  hasProof?: boolean;
  proofDownloadToken?: string;
  proofUrl?: string | null;
};

export type ChecklistAssignee = {
  id: string;
  name: string;
  initials: string;
};

export type EnrichedChecklistItem = ChecklistRow & {
  assigneeName?: string | null;
  assigneeInitials?: string | null;
};

export type BoardTask = PublicTask & {
  assigneeName?: string | null;
  assigneeInitials?: string | null;
  teamName?: string | null;
  activityTitle?: string | null;
  checklistDone: number;
  checklistTotal: number;
  commentCount: number;
  progressPct: number;
  /** Distinct sub-task assignees (for stacked avatars). */
  subAssignees: ChecklistAssignee[];
};

export type TimelineTask = PublicTask & {
  start: Date;
  end: Date;
};

function stripProof(task: TaskRow): Omit<TaskRow, "proofOfWork"> {
  const { proofOfWork: _proof, ...rest } = task;
  return rest;
}

function toDetailTask(task: TaskRow): PublicTask {
  const base = stripProof(task);
  const raw = task.proofOfWork?.trim() ?? "";
  const hasProof = Boolean(raw);
  const proofUrl = raw.startsWith("link:") ? raw.slice(5) : null;
  return {
    ...base,
    hasProof,
    proofUrl,
    ...(hasProof && !proofUrl
      ? { proofDownloadToken: signStorageKey(task.proofOfWork!) }
      : {}),
  };
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const BAN_POSITIONS = new Set<Position>([
  "ban_chuyen_mon",
  "ban_truyen_thong",
  "ban_su_kien",
]);

export function resolveTaskScope(
  user: SessionUser,
  clubId: string,
): TaskScope {
  const m = db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.clubId, clubId), eq(memberships.memberId, user.id)),
    )
    .all()[0];
  const position = (m?.position as Position | undefined) ?? null;
  const teamId = m?.teamId ?? null;
  const perms = memberPermissions(user, clubId);
  const canManageTasks = perms.includes("manage_tasks");
  const canFilterAllTeams =
    position === "owner" || position === "leader" || user.isSuperAdmin === true;
  const forcedTeamId =
    !canFilterAllTeams && position && BAN_POSITIONS.has(position)
      ? teamId
      : null;
  const assigneeOnly = !canManageTasks && !canFilterAllTeams;
  return {
    position,
    teamId,
    canFilterAllTeams,
    forcedTeamId,
    assigneeOnly,
    canManageTasks,
  };
}

function memberTeamId(clubId: string, memberId: string): string | null {
  const m = db
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
  return m?.teamId ?? null;
}

function validateAssignee(
  clubId: string,
  assigneeId: string | null | undefined,
  teamId?: string | null,
) {
  if (!assigneeId) return;
  if (!isActiveMember(clubId, assigneeId)) {
    throw new AppError("VALIDATION", "Assignee must be an active club member", 422);
  }
  if (teamId) {
    const aTeam = memberTeamId(clubId, assigneeId);
    if (aTeam && aTeam !== teamId) {
      throw new AppError(
        "VALIDATION",
        "Assignee must belong to the selected department",
        422,
      );
    }
  }
}

function assertCanManageTeamTasks(
  scope: TaskScope,
  teamId: string | null | undefined,
) {
  if (!scope.canManageTasks) {
    throw new AppError("FORBIDDEN", "Missing permission: manage_tasks", 403);
  }
  if (scope.forcedTeamId) {
    if (!teamId || teamId !== scope.forcedTeamId) {
      throw new AppError(
        "FORBIDDEN",
        "Trưởng ban chỉ được tạo / gán việc trong ban của mình",
        403,
      );
    }
  }
}

function taskVisibleToUser(
  task: TaskRow,
  userId: string,
  scope: TaskScope,
  query?: TaskQuery,
): boolean {
  if (scope.forcedTeamId && task.teamId !== scope.forcedTeamId) return false;
  if (scope.assigneeOnly) {
    if (task.assigneeId === userId) {
      /* ok */
    } else {
      const hit = db
        .select({ id: taskChecklistItems.id })
        .from(taskChecklistItems)
        .where(
          and(
            eq(taskChecklistItems.taskId, task.id),
            eq(taskChecklistItems.assigneeId, userId),
          ),
        )
        .all()[0];
      if (!hit) return false;
    }
  }
  if (query?.teamId && !scope.forcedTeamId && task.teamId !== query.teamId) {
    return false;
  }
  return matchesQuery(task, query);
}

function enrichChecklistItem(item: ChecklistRow): EnrichedChecklistItem {
  const assignee = item.assigneeId
    ? db.select().from(members).where(eq(members.id, item.assigneeId)).all()[0]
    : null;
  return {
    ...item,
    assigneeName: assignee?.fullName ?? null,
    assigneeInitials: initials(assignee?.fullName),
  };
}

function enrichBoardTask(task: TaskRow): BoardTask {
  const checklist = db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, task.id))
    .all();
  const checklistTotal = checklist.length;
  const checklistDone = checklist.filter((c) => c.done).length;
  const fromChecklist =
    checklistTotal > 0
      ? Math.round((checklistDone / checklistTotal) * 100)
      : null;
  const progressPct = Math.min(
    100,
    Math.max(0, fromChecklist ?? task.progress ?? 0),
  );
  const assignee = task.assigneeId
    ? db.select().from(members).where(eq(members.id, task.assigneeId)).all()[0]
    : null;
  const team = task.teamId
    ? db.select().from(teams).where(eq(teams.id, task.teamId)).all()[0]
    : null;
  const activity = task.activityId
    ? db
        .select()
        .from(activities)
        .where(eq(activities.id, task.activityId))
        .all()[0]
    : null;
  const commentCount =
    db
      .select({ n: sql<number>`count(*)` })
      .from(taskComments)
      .where(eq(taskComments.taskId, task.id))
      .all()[0]?.n ?? 0;
  const seen = new Set<string>();
  const subAssignees: ChecklistAssignee[] = [];
  for (const c of checklist) {
    if (!c.assigneeId || seen.has(c.assigneeId)) continue;
    seen.add(c.assigneeId);
    const m = db
      .select()
      .from(members)
      .where(eq(members.id, c.assigneeId))
      .all()[0];
    if (!m) continue;
    subAssignees.push({
      id: m.id,
      name: m.fullName,
      initials: initials(m.fullName),
    });
  }
  if (assignee && !seen.has(assignee.id)) {
    subAssignees.unshift({
      id: assignee.id,
      name: assignee.fullName,
      initials: initials(assignee.fullName),
    });
  }
  return {
    ...toDetailTask(task),
    assigneeName: assignee?.fullName ?? null,
    assigneeInitials: initials(assignee?.fullName),
    teamName: team?.name ?? null,
    activityTitle: activity?.title ?? null,
    checklistDone,
    checklistTotal,
    commentCount: Number(commentCount) || 0,
    progressPct,
    subAssignees,
  };
}

function getTaskOrThrow(taskId: string): TaskRow {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).all()[0];
  if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
  return task;
}

function getChecklistItemOrThrow(itemId: string): ChecklistRow {
  const item = db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.id, itemId))
    .all()[0];
  if (!item) throw new AppError("NOT_FOUND", "Checklist item not found", 404);
  return item;
}

function nextBacklogSortOrder(clubId: string): number {
  const rows = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.clubId, clubId), eq(tasks.status, "backlog")))
    .all();
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((r) => r.sortOrder)) + 1;
}

function nextChecklistSortOrder(taskId: string): number {
  const rows = db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, taskId))
    .all();
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((r) => r.sortOrder)) + 1;
}

function matchesQuery(task: TaskRow, query?: TaskQuery): boolean {
  if (!query) return true;
  if (query.assigneeId && task.assigneeId !== query.assigneeId) return false;
  // teamId filter applied in taskVisibleToUser (respects forcedTeamId)
  if (query.priority && task.priority !== query.priority) return false;
  if (query.status && task.status !== query.status) return false;
  if (query.overdue) {
    if (!task.deadline) return false;
    if (task.status === "done" || task.status === "cancelled") return false;
    if (task.deadline.getTime() >= Date.now()) return false;
  }
  if (query.from || query.to) {
    if (!task.deadline) return false;
    const t = task.deadline.getTime();
    if (query.from && t < query.from.getTime()) return false;
    if (query.to && t > query.to.getTime()) return false;
  }
  return true;
}

function isAssigneeForward(from: TaskStatus, to: TaskStatus): boolean {
  return (
    (from === "backlog" && to === "todo") ||
    (from === "todo" && to === "in_progress") ||
    (from === "in_progress" && to === "review")
  );
}

export function listTasks(
  user: SessionUser,
  clubId: string,
  query?: TaskQuery,
): Omit<TaskRow, "proofOfWork">[] {
  requireClubPermission(user, clubId, "view_club");
  const scope = resolveTaskScope(user, clubId);
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.clubId, clubId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
    .all()
    .filter((t) => taskVisibleToUser(t, user.id, scope, query))
    .map(stripProof);
}

export function kanbanBoard(
  user: SessionUser,
  clubId: string,
  query?: TaskQuery,
): Record<string, BoardTask[]> {
  requireClubPermission(user, clubId, "view_club");
  const scope = resolveTaskScope(user, clubId);
  const full = db
    .select()
    .from(tasks)
    .where(eq(tasks.clubId, clubId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
    .all()
    .filter((t) => taskVisibleToUser(t, user.id, scope, query));
  const enriched = full.map(enrichBoardTask);
  return Object.fromEntries(
    KANBAN_COLUMNS.map((col) => [
      col,
      enriched.filter((t) => t.status === col),
    ]),
  );
}

export function timelineTasks(
  user: SessionUser,
  clubId: string,
  query?: TaskQuery,
): TimelineTask[] {
  const rows = listTasks(user, clubId, {
    ...query,
    // timeline always requires a deadline; empty from/to still drop undated
  }).filter((t) => t.deadline);
  const from = query?.from;
  const to = query?.to;
  return rows
    .filter((t) => {
      const d = t.deadline!.getTime();
      if (from && d < from.getTime()) return false;
      if (to && d > to.getTime()) return false;
      return true;
    })
    .sort(
      (a, b) =>
        (a.deadline?.getTime() ?? 0) - (b.deadline?.getTime() ?? 0),
    )
    .map((t) => ({
      ...t,
      start: t.createdAt,
      end: t.deadline!,
    }));
}

export function getTaskDetail(user: SessionUser, taskId: string) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "view_club");
  const scope = resolveTaskScope(user, task.clubId);
  if (!taskVisibleToUser(task, user.id, scope)) {
    throw new AppError("FORBIDDEN", "Task not visible for your role", 403);
  }
  const checklist = db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, taskId))
    .orderBy(asc(taskChecklistItems.sortOrder), asc(taskChecklistItems.createdAt))
    .all()
    .map(enrichChecklistItem);
  const comments = listTaskComments(user, taskId);
  const activity = listTaskActivity(user, taskId);
  return {
    task: enrichBoardTask(task),
    checklist,
    comments,
    activity,
    scope: {
      canFilterAllTeams: scope.canFilterAllTeams,
      forcedTeamId: scope.forcedTeamId,
      assigneeOnly: scope.assigneeOnly,
      canManageTasks: scope.canManageTasks,
      teamId: scope.teamId,
      position: scope.position,
    },
  };
}

export function setTaskProgress(
  user: SessionUser,
  taskId: string,
  progress: number,
) {
  const task = getTaskOrThrow(taskId);
  const isAssignee = task.assigneeId === user.id;
  if (!isAssignee) {
    requireClubPermission(user, task.clubId, "manage_tasks");
  } else {
    requireClubPermission(user, task.clubId, "view_club");
  }
  const pct = Math.min(100, Math.max(0, Math.round(Number(progress) || 0)));
  db.update(tasks)
    .set({ progress: pct, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .run();
  writeAudit({
    clubId: task.clubId,
    actorId: user.id,
    action: "task.progress",
    objectType: "task",
    objectId: taskId,
    meta: { progress: pct },
  });
  return pct;
}

export function addTaskComment(
  user: SessionUser,
  taskId: string,
  body: string,
) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "view_club");
  const text = body.trim();
  if (text.length < 2) {
    throw new AppError("VALIDATION", "Comment too short", 422);
  }
  const id = nanoid();
  db.insert(taskComments)
    .values({
      id,
      taskId,
      authorId: user.id,
      body: text,
    })
    .run();
  writeAudit({
    clubId: task.clubId,
    actorId: user.id,
    action: "task.comment",
    objectType: "task",
    objectId: taskId,
    meta: { commentId: id },
  });
  return id;
}

export function listTaskComments(user: SessionUser, taskId: string) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "view_club");
  const rows = db
    .select({
      id: taskComments.id,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      authorId: taskComments.authorId,
      authorName: members.fullName,
    })
    .from(taskComments)
    .leftJoin(members, eq(members.id, taskComments.authorId))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt))
    .all();
  return rows;
}

export function listTaskActivity(user: SessionUser, taskId: string) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "view_club");
  const audits = db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      createdAt: auditEvents.createdAt,
      actorId: auditEvents.actorId,
      metaJson: auditEvents.metaJson,
      actorName: members.fullName,
    })
    .from(auditEvents)
    .leftJoin(members, eq(members.id, auditEvents.actorId))
    .where(
      and(eq(auditEvents.objectType, "task"), eq(auditEvents.objectId, taskId)),
    )
    .orderBy(desc(auditEvents.createdAt))
    .all()
    .slice(0, 40);
  return audits.map((a) => {
    const name = a.actorName ?? "Thành viên";
    let text = `${name} đã cập nhật công việc`;
    if (a.action === "task.progress") {
      let pct = "?";
      try {
        pct = String(JSON.parse(a.metaJson ?? "{}")?.progress ?? "?");
      } catch {
        /* ignore */
      }
      text = `${name} đã cập nhật tiến độ lên ${pct}%`;
    } else if (a.action === "task.comment") {
      text = `${name} đã thêm bình luận / báo cáo`;
    } else if (a.action === "task.attach_proof") {
      text = `${name} đã nộp bằng chứng`;
    } else if (a.action === "task.transition") {
      text = `${name} đã chuyển trạng thái`;
    } else if (a.action === "task.create") {
      text = `${name} đã tạo công việc`;
    }
    return {
      id: a.id,
      action: a.action,
      text,
      createdAt: a.createdAt,
    };
  });
}

/** Idempotent PM demo pack for Kanban UI (stable ids). */
export function ensurePmDemoTasks(clubId: string): void {
  const club = db.select().from(clubs).where(eq(clubs.id, clubId)).all()[0];
  if (!club) return;

  const teamRows = db.select().from(teams).where(eq(teams.clubId, clubId)).all();
  const needed = [
    { name: "Ban Chuyên môn", description: "Research" },
    { name: "Ban Truyền thông", description: "Media" },
    { name: "Ban Sự kiện", description: "Events / HR" },
    { name: "Ban Đối ngoại", description: "Partnerships" },
  ];
  for (const t of needed) {
    if (
      teamRows.some(
        (r) => normalizeTeamName(r.name) === normalizeTeamName(t.name),
      )
    ) {
      continue;
    }
    const id = nanoid();
    const now = new Date();
    const nameNormalized = normalizeTeamName(t.name);
    db.insert(teams)
      .values({
        id,
        clubId,
        name: t.name,
        nameNormalized,
        description: t.description,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    teamRows.push({
      id,
      clubId,
      name: t.name,
      nameNormalized,
      description: t.description,
      createdAt: now,
      updatedAt: now,
    });
  }

  const marker = db
    .select()
    .from(tasks)
    .where(eq(tasks.id, "pm-demo-task-01"))
    .all()[0];
  if (marker) return;

  const ownerId = club.ownerId;
  const member =
    db
      .select()
      .from(members)
      .where(eq(members.email, "member@pfc.vn"))
      .all()[0] ?? null;
  const assigneeId = member?.id ?? ownerId;
  const teamByHint = (hint: string) => {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    return (
      teamRows.find((t) => norm(t.name).includes(hint))?.id ??
      teamRows[0]?.id ??
      null
    );
  };

  const samples: Array<{
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: string;
    progress: number;
    teamHint: string;
    deadlineDays: number;
    proof?: string;
    checks: Array<{ title: string; done: boolean }>;
    comments: string[];
  }> = [
    {
      id: "pm-demo-task-01",
      title: "Viết bài 'Ví tiền sinh viên' — series tháng 10",
      description:
        "Outline + draft + thiết kế cover cho series nội dung Ban Truyền thông.",
      status: "in_progress",
      priority: "high",
      progress: 65,
      teamHint: "truyen",
      deadlineDays: 5,
      proof: "link:https://docs.google.com/document/d/demo-vi-tien",
      checks: [
        { title: "Outline 5 mục", done: true },
        { title: "Draft 800 chữ", done: true },
        { title: "Cover Canva", done: false },
        { title: "Duyệt Trưởng ban", done: false },
      ],
      comments: [
        "Đã xong outline, đang viết phần case study.",
        "Nhờ Ban Truyền thông review cover trước thứ Sáu.",
      ],
    },
    {
      id: "pm-demo-task-02",
      title: "Chuẩn bị workshop Budgeting 101",
      description: "Slide + checklist phòng + form đăng ký nội bộ.",
      status: "todo",
      priority: "medium",
      progress: 20,
      teamHint: "chuyen",
      deadlineDays: 12,
      checks: [
        { title: "Outline slide", done: true },
        { title: "Làm slide Figma", done: false },
        { title: "In handout", done: false },
      ],
      comments: ["Ưu tiên slide trước — handout có thể PDF."],
    },
    {
      id: "pm-demo-task-03",
      title: "Thiết kế poster Summit 2026 (Club share)",
      description: "Poster A3 + story IG — gửi review trước khi in.",
      status: "review",
      priority: "high",
      progress: 90,
      teamHint: "kien",
      deadlineDays: 2,
      proof: "link:https://www.figma.com/file/demo-summit-poster",
      checks: [
        { title: "Moodboard", done: true },
        { title: "Poster v2", done: true },
        { title: "Export PDF in", done: true },
      ],
      comments: ["Đã nộp Figma — nhờ Trưởng ban duyệt màu logo."],
    },
    {
      id: "pm-demo-task-04",
      title: "Cập nhật Playbook vận hành CLB",
      description: "Đồng bộ mục Task + Event link theo ADR-008.",
      status: "backlog",
      priority: "low",
      progress: 0,
      teamHint: "chuyen",
      deadlineDays: 21,
      checks: [
        { title: "Rà mục cũ", done: false },
        { title: "Viết diff", done: false },
      ],
      comments: [],
    },
  ];

  for (const s of samples) {
    db.insert(tasks)
      .values({
        id: s.id,
        clubId,
        title: s.title,
        description: s.description,
        status: s.status,
        priority: s.priority,
        assigneeId,
        assignerId: ownerId,
        teamId: teamByHint(s.teamHint),
        deadline: new Date(Date.now() + s.deadlineDays * 86400000),
        proofOfWork: s.proof ?? null,
        progress: s.progress,
        sortOrder: 0,
      })
      .run();
    s.checks.forEach((c, i) => {
      db.insert(taskChecklistItems)
        .values({
          id: `${s.id}-c${i}`,
          taskId: s.id,
          title: c.title,
          done: c.done,
          assigneeId,
          sortOrder: i,
        })
        .run();
    });
    s.comments.forEach((body, i) => {
      db.insert(taskComments)
        .values({
          id: `${s.id}-m${i}`,
          taskId: s.id,
          authorId: i === 0 ? assigneeId : ownerId,
          body,
        })
        .run();
    });
    writeAudit({
      clubId,
      actorId: ownerId,
      action: "task.create",
      objectType: "task",
      objectId: s.id,
      meta: { demo: true },
    });
  }
}

export function createTask(
  user: SessionUser,
  clubId: string,
  input: {
    title: string;
    description?: string;
    assigneeId?: string;
    teamId?: string;
    activityId?: string | null;
    priority?: string;
    deadline?: Date | null;
    subTasks?: {
      title: string;
      assigneeId?: string | null;
      deadline?: Date | null;
    }[];
  },
) {
  requireClubPermission(user, clubId, "manage_tasks");
  const scope = resolveTaskScope(user, clubId);
  const teamId = scope.forcedTeamId ?? input.teamId ?? null;
  assertCanManageTeamTasks(scope, teamId);
  const title = assertTaskTitle(input.title);
  const priority = assertTaskPriority(input.priority);
  validateAssignee(clubId, input.assigneeId, teamId);
  if (input.activityId) {
    const act = db
      .select()
      .from(activities)
      .where(eq(activities.id, input.activityId))
      .all()[0];
    if (!act || act.clubId !== clubId) {
      throw new AppError("VALIDATION", "Activity not found in this club", 422);
    }
  }
  const subTasks = input.subTasks ?? [];
  for (const s of subTasks) {
    assertTaskTitle(s.title);
    validateAssignee(clubId, s.assigneeId, teamId);
  }
  const id = nanoid();
  const sortOrder = nextBacklogSortOrder(clubId);
  sqlite.transaction(() => {
    db.insert(tasks)
      .values({
        id,
        clubId,
        title,
        description: input.description ?? "",
        status: "backlog",
        priority,
        assigneeId: input.assigneeId ?? null,
        assignerId: user.id,
        teamId,
        activityId: input.activityId ?? null,
        deadline: input.deadline ?? null,
        sortOrder,
      })
      .run();
    subTasks.forEach((s, i) => {
      db.insert(taskChecklistItems)
        .values({
          id: nanoid(),
          taskId: id,
          title: assertTaskTitle(s.title),
          done: false,
          assigneeId: s.assigneeId ?? null,
          deadline: s.deadline ?? null,
          sortOrder: i,
        })
        .run();
    });
  })();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "task.create",
    objectType: "task",
    objectId: id,
    meta: { subTaskCount: subTasks.length, teamId },
  });
  if (input.assigneeId) {
    notifyUser({
      recipientId: input.assigneeId,
      clubId,
      type: "task.assigned",
      title: t("notify.task_assigned"),
      body: title,
      payload: { taskId: id },
    });
  }
  for (const s of subTasks) {
    if (s.assigneeId) {
      notifyUser({
        recipientId: s.assigneeId,
        clubId,
        type: "task.assigned",
        title: t("notify.task_assigned"),
        body: `${title} · ${s.title}`,
        payload: { taskId: id },
      });
    }
  }
  return id;
}

export function updateTask(
  user: SessionUser,
  taskId: string,
  input: {
    title?: string;
    description?: string;
    priority?: string;
    deadline?: Date | null;
    teamId?: string | null;
    activityId?: string | null;
  },
) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "manage_tasks");
  const scope = resolveTaskScope(user, task.clubId);
  assertCanManageTeamTasks(scope, task.teamId);
  if (input.teamId !== undefined) {
    assertCanManageTeamTasks(scope, input.teamId);
  }
  const patch: Partial<TaskRow> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = assertTaskTitle(input.title);
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = assertTaskPriority(input.priority);
  if (input.deadline !== undefined) patch.deadline = input.deadline;
  if (input.teamId !== undefined) patch.teamId = input.teamId;
  if (input.activityId !== undefined) patch.activityId = input.activityId;
  db.update(tasks).set(patch).where(eq(tasks.id, taskId)).run();
  writeAudit({
    clubId: task.clubId,
    actorId: user.id,
    action: "task.update",
    objectType: "task",
    objectId: taskId,
  });
}

export function assignTask(
  user: SessionUser,
  taskId: string,
  assigneeId: string | null,
) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "manage_tasks");
  const scope = resolveTaskScope(user, task.clubId);
  assertCanManageTeamTasks(scope, task.teamId);
  validateAssignee(task.clubId, assigneeId, task.teamId);
  db.update(tasks)
    .set({
      assigneeId,
      assignerId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
    .run();
  writeAudit({
    clubId: task.clubId,
    actorId: user.id,
    action: "task.assign",
    objectType: "task",
    objectId: taskId,
    meta: { assigneeId },
  });
  if (assigneeId) {
    notifyUser({
      recipientId: assigneeId,
      clubId: task.clubId,
      type: "task.assigned",
      title: t("notify.task_assigned"),
      body: task.title,
      payload: { taskId },
    });
  }
}

export function attachProofOfWork(
  user: SessionUser,
  taskId: string,
  input: { storageKey: string; mimeType: string; sizeBytes: number },
) {
  const task = getTaskOrThrow(taskId);
  const isAssignee = task.assigneeId === user.id;
  if (!isAssignee) {
    requireClubPermission(user, task.clubId, "manage_tasks");
  } else {
    requireClubPermission(user, task.clubId, "view_club");
  }
  const storageKey = assertProofOfWorkUpload(input);
  db.update(tasks)
    .set({ proofOfWork: storageKey, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .run();
  writeAudit({
    clubId: task.clubId,
    actorId: user.id,
    action: "task.attach_proof",
    objectType: "task",
    objectId: taskId,
  });
}

export function transitionTask(
  user: SessionUser,
  taskId: string,
  toRaw: string,
  opts?: { proofOfWork?: string; expectedUpdatedAt?: number },
) {
  const task = getTaskOrThrow(taskId);
  const to = assertKnownTaskStatus(toRaw);
  const from = assertKnownTaskStatus(task.status);
  const spec = {
    action: "task.transition",
    resourceType: "task",
    resourceId: taskId,
    metadata: { from, to },
  };

  // Object-level: always membership on the task's club first (no assignee skip).
  let bypass = requireSensitivePermission(user, task.clubId, "view_club", spec)
    .bypass;

  assertLegalTaskTransition(from, to);
  assertOptimisticTaskLock(task.updatedAt, opts?.expectedUpdatedAt);

  const proof = opts?.proofOfWork ?? task.proofOfWork;
  if (to === "review") {
    assertProofPresentForReview(proof);
  }

  const isAssignee = task.assigneeId === user.id;
  if (to === "cancelled") {
    bypass = requireSensitivePermission(
      user,
      task.clubId,
      "manage_tasks",
      spec,
    ).bypass;
  } else if (to === "done" || (from === "review" && to === "in_progress")) {
    bypass = requireSensitivePermission(
      user,
      task.clubId,
      "review_tasks",
      spec,
    ).bypass;
  } else if (isAssignee && isAssigneeForward(from, to)) {
    // view_club already satisfied — assignee may advance forward.
  } else {
    bypass = requireSensitivePermission(
      user,
      task.clubId,
      "manage_tasks",
      spec,
    ).bypass;
  }

  sqlite.transaction(() => {
    db.update(tasks)
      .set({
        status: to,
        proofOfWork: proof ?? task.proofOfWork,
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
  if (to === "done") incMetric("club.tasks_done");
  if (to === "review") {
    const club = db
      .select()
      .from(clubs)
      .where(eq(clubs.id, task.clubId))
      .all()[0];
    if (club?.ownerId && club.ownerId !== user.id) {
      notifyUser({
        recipientId: club.ownerId,
        clubId: task.clubId,
        type: "task.review_requested",
        title: t("notify.review_requested"),
        body: task.title,
        payload: { taskId },
      });
    }
  }
}

export function reviewTask(
  user: SessionUser,
  taskId: string,
  decisionRaw: string,
  reason?: string,
): { to: TaskStatus } {
  const task = getTaskOrThrow(taskId);
  const decision = assertReviewDecision(decisionRaw);
  const note = assertReviewReason(decision, reason);
  const to = reviewTargetStatus(decision);
  const from = assertKnownTaskStatus(task.status);
  const spec = {
    action: "task.review",
    resourceType: "task",
    resourceId: taskId,
    metadata: { from, to, decision, reason: note },
  };
  const { bypass } = requireSensitivePermission(
    user,
    task.clubId,
    "review_tasks",
    spec,
  );
  if (from !== "review") {
    throw new AppError(
      "ILLEGAL_TRANSITION",
      `Illegal task transition: ${from} → ${to} (review required)`,
      422,
    );
  }
  assertLegalTaskTransition(from, to);

  sqlite.transaction(() => {
    db.update(tasks)
      .set({ status: to, updatedAt: new Date() })
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

  if (to === "done") incMetric("club.tasks_done");
  return { to };
}

export function cancelTask(user: SessionUser, taskId: string) {
  transitionTask(user, taskId, "cancelled");
}

export function reorderKanban(
  user: SessionUser,
  taskId: string,
  input: { status: string; sortOrder: number; expectedUpdatedAt?: number },
) {
  const task = getTaskOrThrow(taskId);
  const status = assertKnownTaskStatus(input.status);
  const from = assertKnownTaskStatus(task.status);
  const spec = {
    action: "task.reorder",
    resourceType: "task",
    resourceId: taskId,
    metadata: { from, to: status, sortOrder: input.sortOrder },
  };
  const { bypass } = requireSensitivePermission(
    user,
    task.clubId,
    "manage_tasks",
    spec,
  );
  assertOptimisticTaskLock(task.updatedAt, input.expectedUpdatedAt);
  if (from !== status) {
    assertLegalTaskTransition(from, status);
  }

  sqlite.transaction(() => {
    db.update(tasks)
      .set({
        status,
        sortOrder: input.sortOrder,
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
  opts?: {
    clubId?: string;
    assigneeId?: string | null;
    deadline?: Date | null;
  },
) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "manage_tasks");
  const scope = resolveTaskScope(user, task.clubId);
  assertCanManageTeamTasks(scope, task.teamId);
  if (opts?.clubId) {
    assertResourceInClub(task.clubId, opts.clubId);
  }
  validateAssignee(task.clubId, opts?.assigneeId, task.teamId);
  const trimmed = assertTaskTitle(title);
  const id = nanoid();
  db.insert(taskChecklistItems)
    .values({
      id,
      taskId,
      title: trimmed,
      done: false,
      assigneeId: opts?.assigneeId ?? null,
      deadline: opts?.deadline ?? null,
      sortOrder: nextChecklistSortOrder(taskId),
    })
    .run();
  if (opts?.assigneeId) {
    notifyUser({
      recipientId: opts.assigneeId,
      clubId: task.clubId,
      type: "task.assigned",
      title: t("notify.task_assigned"),
      body: `${task.title} · ${trimmed}`,
      payload: { taskId },
    });
  }
  return id;
}

export function updateChecklistItem(
  user: SessionUser,
  itemId: string,
  patch: {
    title?: string;
    done?: boolean;
    assigneeId?: string | null;
    deadline?: Date | null;
  },
  opts?: { taskId?: string; clubId?: string },
) {
  const item = getChecklistItemOrThrow(itemId);
  const task = getTaskOrThrow(item.taskId);
  requireClubPermission(user, task.clubId, "manage_tasks");
  const scope = resolveTaskScope(user, task.clubId);
  assertCanManageTeamTasks(scope, task.teamId);
  assertChecklistBelongsToTask({
    itemTaskId: item.taskId,
    expectedTaskId: opts?.taskId ?? item.taskId,
    taskClubId: task.clubId,
    expectedClubId: opts?.clubId,
  });
  if (patch.assigneeId !== undefined) {
    validateAssignee(task.clubId, patch.assigneeId, task.teamId);
  }
  const next: Partial<ChecklistRow> = {};
  if (patch.title !== undefined) next.title = assertTaskTitle(patch.title);
  if (patch.done !== undefined) next.done = patch.done;
  if (patch.assigneeId !== undefined) next.assigneeId = patch.assigneeId;
  if (patch.deadline !== undefined) next.deadline = patch.deadline;
  db.update(taskChecklistItems)
    .set(next)
    .where(eq(taskChecklistItems.id, itemId))
    .run();
}

export function toggleChecklistItem(
  user: SessionUser,
  itemId: string,
  done: boolean,
  opts?: { taskId?: string; clubId?: string },
) {
  const item = getChecklistItemOrThrow(itemId);
  const task = getTaskOrThrow(item.taskId);
  requireClubPermission(user, task.clubId, "view_club");
  const scope = resolveTaskScope(user, task.clubId);
  const canToggle =
    scope.canManageTasks ||
    task.assigneeId === user.id ||
    item.assigneeId === user.id;
  if (!canToggle) {
    throw new AppError("FORBIDDEN", "Only assignee can update this sub-task", 403);
  }
  if (!taskVisibleToUser(task, user.id, scope)) {
    throw new AppError("FORBIDDEN", "Task not visible for your role", 403);
  }
  assertChecklistBelongsToTask({
    itemTaskId: item.taskId,
    expectedTaskId: opts?.taskId ?? item.taskId,
    taskClubId: task.clubId,
    expectedClubId: opts?.clubId,
  });
  db.update(taskChecklistItems)
    .set({ done })
    .where(eq(taskChecklistItems.id, itemId))
    .run();
}

export function deleteChecklistItem(
  user: SessionUser,
  itemId: string,
  opts?: { taskId?: string; clubId?: string },
) {
  const item = getChecklistItemOrThrow(itemId);
  const task = getTaskOrThrow(item.taskId);
  requireClubPermission(user, task.clubId, "manage_tasks");
  const scope = resolveTaskScope(user, task.clubId);
  assertCanManageTeamTasks(scope, task.teamId);
  assertChecklistBelongsToTask({
    itemTaskId: item.taskId,
    expectedTaskId: opts?.taskId ?? item.taskId,
    taskClubId: task.clubId,
    expectedClubId: opts?.clubId,
  });
  db.delete(taskChecklistItems)
    .where(eq(taskChecklistItems.id, itemId))
    .run();
}

export function listChecklist(user: SessionUser, taskId: string) {
  const task = getTaskOrThrow(taskId);
  requireClubPermission(user, task.clubId, "view_club");
  const scope = resolveTaskScope(user, task.clubId);
  if (!taskVisibleToUser(task, user.id, scope)) {
    throw new AppError("FORBIDDEN", "Task not visible for your role", 403);
  }
  return db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, taskId))
    .orderBy(asc(taskChecklistItems.sortOrder), asc(taskChecklistItems.createdAt))
    .all()
    .map(enrichChecklistItem);
}
