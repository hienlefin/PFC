import { NextResponse } from "next/server";
import { seedDemo } from "@/db/migrate";
import {
  assertRequiredIndexesPresent,
  dbPing,
  listAppliedMigrations,
} from "@/db/migrate-meta";
import { login, logout, requireSession, getSession, newCorrelationId } from "@/lib/auth";
import { isSsoEnabled, buildSsoStartUrl } from "@/platform/sso";
import { resolveExternalEvents } from "@/platform/event-engine";
import { errorEnvelope, AppError } from "@/lib/errors";
import { memberPermissions } from "@/lib/authz";
import { withIdempotency } from "@/lib/audit";
import * as clubs from "@/server/clubs";
import * as tasks from "@/server/tasks";
import * as ops from "@/server/ops";
import * as privacy from "@/server/privacy";
import { clubFlags } from "@/platform/flags";
import { logJson } from "@/platform/logger";
import { runClubJobs } from "@/platform/jobs";
import { resolveSignedStorageKey, storageReady } from "@/platform/storage";
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  upsertNotificationPreferences,
} from "@/platform/notify";
import { assertRateLimit } from "@/platform/rate-limit";
import { incMetric, snapshotMetrics } from "@/platform/metrics";
import { resolveLocale, t, type MessageKey } from "@/i18n/messages";

seedDemo().catch(console.error);

type Body = Record<string, unknown>;

async function parseBody(req: Request): Promise<Body> {
  try {
    return (await req.json()) as Body;
  } catch {
    return {};
  }
}

function taskQueryFromUrl(url: URL) {
  return {
    assigneeId: url.searchParams.get("assigneeId") ?? undefined,
    teamId: url.searchParams.get("teamId") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    overdue: url.searchParams.get("overdue") === "1",
    from: url.searchParams.get("from")
      ? new Date(String(url.searchParams.get("from")))
      : undefined,
    to: url.searchParams.get("to")
      ? new Date(String(url.searchParams.get("to")))
      : undefined,
  };
}

export async function GET(req: Request) {
  const correlationId = newCorrelationId();
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "health";

    if (action === "health" || action === "ready") {
      const dbOk = dbPing();
      const missingIndexes = dbOk ? assertRequiredIndexesPresent() : [];
      const ok = dbOk && missingIndexes.length === 0 && storageReady();
      return NextResponse.json(
        {
          ok,
          service: "pfc-club-management",
          checks: {
            db: dbOk,
            storage: storageReady(),
            missingIndexes,
            migrations: listAppliedMigrations(),
          },
          flags: clubFlags(),
          correlationId,
        },
        { status: ok ? 200 : 503 },
      );
    }

    if (action === "bootstrap") {
      await seedDemo();
      return NextResponse.json({ ok: true, seeded: true, correlationId });
    }

    if (action === "sso_status") {
      return NextResponse.json({
        ok: true,
        sso: {
          enabled: isSsoEnabled(),
          mode: process.env.PLATFORM_SSO_MODE ?? "off",
        },
        correlationId,
      });
    }

    if (action === "download") {
      const token = url.searchParams.get("token") ?? "";
      const storageKey = resolveSignedStorageKey(token);
      return NextResponse.json({ ok: true, storageKey, correlationId });
    }

    const user = await requireSession();

    if (action === "me") {
      return NextResponse.json({ ok: true, user, correlationId });
    }

    if (action === "clubs") {
      return NextResponse.json({
        ok: true,
        clubs: clubs.listClubsForUser(user),
        correlationId,
      });
    }

    if (action === "search") {
      return NextResponse.json({
        ok: true,
        clubs: clubs.searchDiscoverableClubs(
          user,
          url.searchParams.get("q") ?? undefined,
        ),
        correlationId,
      });
    }

    if (action === "notifications") {
      return NextResponse.json({
        ok: true,
        notifications: listNotifications(user.id, {
          unreadOnly: url.searchParams.get("unread") === "1",
        }),
        correlationId,
      });
    }

    if (action === "notify_prefs") {
      return NextResponse.json({
        ok: true,
        prefs: getNotificationPreferences(user.id),
        correlationId,
      });
    }

    if (action === "metrics") {
      if (!user.isSuperAdmin) {
        throw new AppError("FORBIDDEN", "Metrics require super admin", 403);
      }
      return NextResponse.json({
        ok: true,
        metrics: snapshotMetrics(),
        correlationId,
      });
    }

    if (action === "i18n") {
      const locale = resolveLocale(url.searchParams.get("lang"));
      const keys = [
        "error.unauthenticated",
        "error.forbidden",
        "error.rate_limited",
        "error.private_club",
        "empty.notifications",
        "a11y.skip_to_content",
      ] as MessageKey[];
      return NextResponse.json({
        ok: true,
        locale,
        messages: Object.fromEntries(keys.map((k) => [k, t(k, locale)])),
        correlationId,
      });
    }

    if (action === "export_pii") {
      return NextResponse.json({
        ok: true,
        export: privacy.exportMembershipPii(
          user,
          String(url.searchParams.get("membershipId") ?? ""),
        ),
        correlationId,
      });
    }

    if (action === "task_detail") {
      const detail = tasks.getTaskDetail(
        user,
        String(url.searchParams.get("taskId") ?? ""),
      );
      clubs.assertCanViewClub(user, detail.task.clubId);
      return NextResponse.json({ ok: true, ...detail, correlationId });
    }

    if (action === "checklist") {
      return NextResponse.json({
        ok: true,
        items: tasks.listChecklist(
          user,
          String(url.searchParams.get("taskId") ?? ""),
        ),
        correlationId,
      });
    }

    if (action === "membership_history") {
      return NextResponse.json({
        ok: true,
        history: clubs.listMembershipHistory(
          user,
          String(url.searchParams.get("membershipId") ?? ""),
        ),
        correlationId,
      });
    }

    if (action === "member_hr_profile") {
      const profile = clubs.getMemberHrProfile(
        user,
        String(url.searchParams.get("membershipId") ?? ""),
      );
      return NextResponse.json({ ok: true, ...profile, correlationId });
    }

    const primary = clubs.getPrimaryClub();
    const clubId = url.searchParams.get("clubId") ?? primary.id;
    clubs.assertCanViewClub(user, clubId);

    if (action === "home") {
      const perms = memberPermissions(user, clubId);
      const rawLinks = perms.includes("view_club")
        ? ops.listLinkedEvents(user, clubId)
        : [];
      const resolved = await resolveExternalEvents(
        rawLinks.map((l) => l.externalEventId),
        Object.fromEntries(rawLinks.map((l) => [l.externalEventId, l.label])),
      );
      const links = rawLinks.map((l) => ({
        ...l,
        event: resolved.get(l.externalEventId) ?? null,
      }));
      const pendingMembers = perms.includes("approve_memberships")
        ? clubs
            .listMembers(user, clubId)
            .filter((m) => m.status === "pending")
        : [];
      const reviewTasks = perms.includes("review_tasks")
        ? (tasks.kanbanBoard(user, clubId).review ?? [])
        : [];
      return NextResponse.json({
        ok: true,
        club: clubs.getClubOrThrow(clubId),
        teams: clubs.listTeams(user, clubId),
        myMembership: clubs.getMyMembership(clubId, user.id),
        user,
        permissions: perms,
        report: perms.includes("view_reports")
          ? clubs.clubReport(user, clubId)
          : null,
        members: perms.includes("view_members")
          ? clubs.listMembers(user, clubId)
          : [],
        kanban: perms.includes("view_club")
          ? tasks.kanbanBoard(user, clubId)
          : {},
        timeline: perms.includes("view_club")
          ? tasks.timelineTasks(user, clubId)
          : [],
        taskScope: perms.includes("view_club")
          ? (() => {
              const s = tasks.resolveTaskScope(user, clubId);
              return {
                canFilterAllTeams: s.canFilterAllTeams,
                forcedTeamId: s.forcedTeamId,
                assigneeOnly: s.assigneeOnly,
                canManageTasks: s.canManageTasks,
                teamId: s.teamId,
                position: s.position,
              };
            })()
          : null,
        activities: perms.includes("view_club")
          ? ops.listActivities(user, clubId)
          : [],
        documents: perms.includes("view_club")
          ? ops.listDocuments(user, clubId)
          : [],
        links,
        approvalQueue: {
          memberships: pendingMembers,
          taskReviews: reviewTasks,
          note:
            "CMS-SYS (duyệt bài/học/tài chính từ Hub khác) thuộc Platform Core — không nằm trong Club (ADR-004/008).",
        },
        notifications: listNotifications(user.id).slice(0, 20),
        inviteLink: perms.includes("manage_members")
          ? clubs.ensureInviteLink(user, clubId)
          : null,
        correlationId,
      });
    }

    switch (action) {
      case "club":
        return NextResponse.json({
          ok: true,
          club: clubs.getClubOrThrow(clubId),
          teams: clubs.listTeams(user, clubId),
          correlationId,
        });
      case "members":
        return NextResponse.json({
          ok: true,
          members: clubs.listMembers(user, clubId),
          correlationId,
        });
      case "tasks": {
        const query = taskQueryFromUrl(url);
        return NextResponse.json({
          ok: true,
          tasks: tasks.listTasks(user, clubId, query),
          kanban: tasks.kanbanBoard(user, clubId, query),
          timeline: tasks.timelineTasks(user, clubId, query),
          correlationId,
        });
      }
      case "report":
        return NextResponse.json({
          ok: true,
          report: clubs.clubReport(user, clubId),
          correlationId,
        });
      case "activities":
        return NextResponse.json({
          ok: true,
          activities: ops.listActivities(user, clubId),
          correlationId,
        });
      case "activity": {
        const activityId = url.searchParams.get("activityId");
        if (!activityId) {
          throw new AppError("VALIDATION", "activityId required", 400);
        }
        return NextResponse.json({
          ok: true,
          activity: ops.getActivity(user, activityId),
          correlationId,
        });
      }
      case "documents":
        return NextResponse.json({
          ok: true,
          documents: ops.listDocuments(user, clubId),
          correlationId,
        });
      case "events": {
        const unavailable = url.searchParams.get("unavailable");
        return NextResponse.json({
          ok: true,
          links: ops.listLinkedEvents(user, clubId, {
            unavailableEventIds: unavailable
              ? unavailable.split(",").filter(Boolean)
              : undefined,
          }),
          correlationId,
        });
      }
      case "audit":
        return NextResponse.json({
          ok: true,
          audit: clubs.recentAudit(user, clubId),
          correlationId,
        });
      default:
        throw new AppError("VALIDATION", `Unknown action ${action}`, 400);
    }
  } catch (err) {
    const e = errorEnvelope(err, correlationId);
    if (e.status === 403) incMetric("club.http_403");
    if (e.status === 429) incMetric("club.http_429");
    logJson("error", "club.api.get", {
      correlationId,
      code: e.error.code,
      status: e.status,
    });
    return NextResponse.json(e, { status: e.status });
  }
}

export async function POST(req: Request) {
  const correlationId = newCorrelationId();
  try {
    const body = await parseBody(req);
    const action = String(body.action ?? "");
    const idempotencyKey =
      req.headers.get("idempotency-key") ??
      (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null);

    if (action === "login") {
      const user = await login(String(body.email), String(body.password));
      return NextResponse.json({ ok: true, user, correlationId });
    }
    if (action === "logout") {
      await logout();
      return NextResponse.json({ ok: true, correlationId });
    }
    if (action === "sso_start") {
      const started = buildSsoStartUrl({
        email: body.email ? String(body.email) : undefined,
        name: body.name ? String(body.name) : undefined,
      });
      return NextResponse.json({
        ok: true,
        sso: started,
        correlationId,
      });
    }

    const user = await requireSession();

    if (action === "run_jobs") {
      if (!user.isSuperAdmin) {
        throw new AppError("FORBIDDEN", "Jobs require super admin", 403);
      }
      return NextResponse.json({
        ok: true,
        jobs: runClubJobs(),
        correlationId,
      });
    }

    if (action === "mark_notification_read") {
      const ok = markNotificationRead(user.id, String(body.notificationId));
      if (!ok) throw new AppError("NOT_FOUND", "Notification not found", 404);
      return NextResponse.json({ ok: true, correlationId });
    }
    if (action === "mark_all_notifications_read") {
      markAllNotificationsRead(user.id);
      return NextResponse.json({ ok: true, correlationId });
    }
    if (action === "update_notify_prefs") {
      return NextResponse.json({
        ok: true,
        prefs: upsertNotificationPreferences(user.id, {
          inApp: body.inApp !== undefined ? Boolean(body.inApp) : undefined,
          email: body.email !== undefined ? Boolean(body.email) : undefined,
          push: body.push !== undefined ? Boolean(body.push) : undefined,
        }),
        correlationId,
      });
    }
    if (action === "export_pii") {
      return NextResponse.json({
        ok: true,
        export: privacy.exportMembershipPii(user, String(body.membershipId)),
        correlationId,
      });
    }
    if (action === "privacy_anonymize") {
      return NextResponse.json({
        ok: true,
        result: privacy.anonymizeMembershipPii(
          user,
          String(body.membershipId),
          body.note ? String(body.note) : undefined,
        ),
        correlationId,
      });
    }

    const primary = clubs.getPrimaryClub();
    const clubId = body.clubId ? String(body.clubId) : primary.id;

    const result = withIdempotency(idempotencyKey, () => {
      switch (action) {
        case "create_club":
          throw new AppError(
            "SINGLE_CLUB",
            "Hệ thống PFC chỉ vận hành 1 câu lạc bộ",
            400,
          );
        case "join_club":
          assertRateLimit(user.id, "join_club");
          return {
            join: clubs.requestJoin(
              user,
              clubId,
              body.joinReason ? String(body.joinReason) : undefined,
              body.inviteCode ? String(body.inviteCode) : undefined,
              body.preferredTeamId
                ? String(body.preferredTeamId)
                : body.preferredTeamId === null
                  ? null
                  : undefined,
            ),
          };
        case "leave_club":
          return { leave: clubs.leaveClub(user, clubId) };
        case "invite_member":
          assertRateLimit(user.id, "invite");
          return {
            invite: clubs.inviteOrAddMember(user, clubId, {
              emailOrCode: String(body.emailOrCode ?? body.email ?? ""),
              position: body.position as never,
              teamId:
                body.teamId === null
                  ? null
                  : body.teamId
                    ? String(body.teamId)
                    : undefined,
            }),
          };
        case "rotate_invite_link":
          assertRateLimit(user.id, "invite");
          return { inviteLink: clubs.rotateInviteLink(user, clubId) };
        case "ensure_invite_link":
          return { inviteLink: clubs.ensureInviteLink(user, clubId) };
        case "membership_transition":
          clubs.transitionMembership(
            user,
            String(body.membershipId),
            body.to as never,
            body.note ? String(body.note) : undefined,
          );
          return { ok: true };
        case "kick_member":
          clubs.kickMember(
            user,
            String(body.membershipId),
            body.note ? String(body.note) : undefined,
          );
          return { ok: true };
        case "transfer_owner":
          return {
            transfer: clubs.transferOwner(user, String(body.membershipId)),
          };
        case "assign_position":
          clubs.assignPosition(
            user,
            String(body.membershipId),
            body.position as never,
          );
          return { ok: true };
        case "assign_team":
          clubs.assignMemberTeam(
            user,
            String(body.membershipId),
            body.teamId === null || body.teamId === ""
              ? null
              : String(body.teamId),
          );
          return { ok: true };
        case "create_team":
          return {
            teamId: clubs.createTeam(user, clubId, {
              name: String(body.name),
              description: body.description
                ? String(body.description)
                : undefined,
            }),
          };
        case "update_team":
          return {
            teamId: clubs.updateTeam(user, String(body.teamId), {
              name: body.name ? String(body.name) : undefined,
              description:
                body.description !== undefined
                  ? String(body.description)
                  : undefined,
            }),
          };
        case "delete_team":
          clubs.deleteTeam(user, String(body.teamId));
          return { ok: true };
        case "create_task":
          return {
            taskId: tasks.createTask(user, clubId, {
              title: String(body.title),
              description: body.description
                ? String(body.description)
                : undefined,
              assigneeId: body.assigneeId
                ? String(body.assigneeId)
                : undefined,
              teamId: body.teamId ? String(body.teamId) : undefined,
              activityId: body.activityId
                ? String(body.activityId)
                : body.activityId === null
                  ? null
                  : undefined,
              priority: body.priority ? String(body.priority) : undefined,
              deadline: body.deadline
                ? new Date(String(body.deadline))
                : null,
              subTasks: Array.isArray(body.subTasks)
                ? body.subTasks.map(
                    (s: {
                      title?: unknown;
                      assigneeId?: unknown;
                      deadline?: unknown;
                    }) => ({
                      title: String(s.title ?? ""),
                      assigneeId: s.assigneeId
                        ? String(s.assigneeId)
                        : null,
                      deadline: s.deadline
                        ? new Date(String(s.deadline))
                        : null,
                    }),
                  )
                : undefined,
            }),
          };
        case "update_task":
          tasks.updateTask(user, String(body.taskId), {
            title: body.title ? String(body.title) : undefined,
            description:
              body.description !== undefined
                ? String(body.description)
                : undefined,
            priority: body.priority ? String(body.priority) : undefined,
            deadline:
              body.deadline !== undefined
                ? body.deadline
                  ? new Date(String(body.deadline))
                  : null
                : undefined,
            teamId:
              body.teamId !== undefined
                ? body.teamId
                  ? String(body.teamId)
                  : null
                : undefined,
          });
          return { ok: true };
        case "assign_task":
          tasks.assignTask(
            user,
            String(body.taskId),
            body.assigneeId ? String(body.assigneeId) : null,
          );
          return { ok: true };
        case "attach_proof":
          tasks.attachProofOfWork(user, String(body.taskId), {
            storageKey: String(body.storageKey),
            mimeType: String(body.mimeType ?? "application/pdf"),
            sizeBytes: Number(body.sizeBytes ?? 0),
          });
          return { ok: true };
        case "set_task_progress":
          return {
            progress: tasks.setTaskProgress(
              user,
              String(body.taskId),
              Number(body.progress),
            ),
          };
        case "add_task_comment":
          return {
            commentId: tasks.addTaskComment(
              user,
              String(body.taskId),
              String(body.body ?? ""),
            ),
          };
        case "task_transition":
          assertRateLimit(user.id, "task_transition");
          tasks.transitionTask(
            user,
            String(body.taskId),
            String(body.to),
            {
              proofOfWork: body.proofOfWork
                ? String(body.proofOfWork)
                : undefined,
              expectedUpdatedAt:
                body.expectedUpdatedAt !== undefined
                  ? Number(body.expectedUpdatedAt)
                  : undefined,
            },
          );
          return { ok: true };
        case "review_task":
          return {
            review: tasks.reviewTask(
              user,
              String(body.taskId),
              String(body.decision),
              body.reason ? String(body.reason) : undefined,
            ),
          };
        case "cancel_task":
          tasks.cancelTask(user, String(body.taskId));
          return { ok: true };
        case "reorder_kanban":
          assertRateLimit(user.id, "reorder_kanban");
          tasks.reorderKanban(user, String(body.taskId), {
            status: String(body.status),
            sortOrder: Number(body.sortOrder ?? 0),
            expectedUpdatedAt:
              body.expectedUpdatedAt !== undefined
                ? Number(body.expectedUpdatedAt)
                : undefined,
          });
          return { ok: true };
        case "add_checklist":
          return {
            itemId: tasks.addChecklistItem(
              user,
              String(body.taskId),
              String(body.title),
              {
                clubId: body.clubId ? String(body.clubId) : undefined,
                assigneeId:
                  body.assigneeId !== undefined
                    ? body.assigneeId
                      ? String(body.assigneeId)
                      : null
                    : undefined,
                deadline:
                  body.deadline !== undefined
                    ? body.deadline
                      ? new Date(String(body.deadline))
                      : null
                    : undefined,
              },
            ),
          };
        case "update_checklist":
          tasks.updateChecklistItem(
            user,
            String(body.itemId),
            {
              title: body.title ? String(body.title) : undefined,
              done: body.done !== undefined ? Boolean(body.done) : undefined,
              assigneeId:
                body.assigneeId !== undefined
                  ? body.assigneeId
                    ? String(body.assigneeId)
                    : null
                  : undefined,
              deadline:
                body.deadline !== undefined
                  ? body.deadline
                    ? new Date(String(body.deadline))
                    : null
                  : undefined,
            },
            {
              taskId: body.taskId ? String(body.taskId) : undefined,
              clubId: body.clubId ? String(body.clubId) : undefined,
            },
          );
          return { ok: true };
        case "toggle_checklist":
          tasks.toggleChecklistItem(
            user,
            String(body.itemId),
            Boolean(body.done),
            {
              taskId: body.taskId ? String(body.taskId) : undefined,
              clubId: body.clubId ? String(body.clubId) : undefined,
            },
          );
          return { ok: true };
        case "delete_checklist":
          tasks.deleteChecklistItem(user, String(body.itemId), {
            taskId: body.taskId ? String(body.taskId) : undefined,
            clubId: body.clubId ? String(body.clubId) : undefined,
          });
          return { ok: true };
        case "create_activity": {
          const startsAt = body.startsAt
            ? new Date(String(body.startsAt))
            : null;
          const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
          const mediaUrls = Array.isArray(body.mediaUrls)
            ? body.mediaUrls.map(String)
            : undefined;
          const videoEmbeds = Array.isArray(body.videoEmbeds)
            ? body.videoEmbeds.map(String)
            : undefined;
          return {
            activityId: ops.createActivity(user, clubId, {
              title: String(body.title ?? ""),
              description: body.description
                ? String(body.description)
                : undefined,
              kind:
                body.kind === "linked" || body.kind === "internal"
                  ? body.kind
                  : "internal",
              location: body.location != null ? String(body.location) : null,
              mode:
                body.mode === "online" ||
                body.mode === "offline" ||
                body.mode === "hybrid"
                  ? body.mode
                  : "offline",
              coverUrl: body.coverUrl != null ? String(body.coverUrl) : null,
              bodyMd: body.bodyMd != null ? String(body.bodyMd) : undefined,
              videoUrl: body.videoUrl != null ? String(body.videoUrl) : null,
              mediaUrls,
              videoEmbeds,
              capacity:
                body.capacity === null || body.capacity === ""
                  ? null
                  : body.capacity != null
                    ? Number(body.capacity)
                    : null,
              registerDeadline: body.registerDeadline
                ? new Date(String(body.registerDeadline))
                : null,
              hostTeamId:
                body.hostTeamId != null && String(body.hostTeamId)
                  ? String(body.hostTeamId)
                  : null,
              cta:
                body.cta && typeof body.cta === "object"
                  ? (body.cta as {
                      register?: boolean;
                      btc?: boolean;
                      checkin?: boolean;
                    })
                  : undefined,
              externalEventId:
                body.externalEventId != null
                  ? String(body.externalEventId)
                  : null,
              startsAt,
              endsAt,
              status: body.publish === true || body.status === "active"
                ? "active"
                : "draft",
            }),
          };
        }
        case "update_activity": {
          return {
            activity: ops.updateActivity(user, String(body.activityId), {
              title: body.title != null ? String(body.title) : undefined,
              description:
                body.description != null ? String(body.description) : undefined,
              kind:
                body.kind === "linked" || body.kind === "internal"
                  ? body.kind
                  : undefined,
              location:
                body.location !== undefined
                  ? body.location == null
                    ? null
                    : String(body.location)
                  : undefined,
              mode:
                body.mode === "online" ||
                body.mode === "offline" ||
                body.mode === "hybrid"
                  ? body.mode
                  : undefined,
              coverUrl:
                body.coverUrl !== undefined
                  ? body.coverUrl == null
                    ? null
                    : String(body.coverUrl)
                  : undefined,
              bodyMd: body.bodyMd != null ? String(body.bodyMd) : undefined,
              videoUrl:
                body.videoUrl !== undefined
                  ? body.videoUrl == null
                    ? null
                    : String(body.videoUrl)
                  : undefined,
              mediaUrls: Array.isArray(body.mediaUrls)
                ? body.mediaUrls.map(String)
                : undefined,
              videoEmbeds: Array.isArray(body.videoEmbeds)
                ? body.videoEmbeds.map(String)
                : undefined,
              capacity:
                body.capacity !== undefined
                  ? body.capacity === null || body.capacity === ""
                    ? null
                    : Number(body.capacity)
                  : undefined,
              registerDeadline:
                body.registerDeadline !== undefined
                  ? body.registerDeadline
                    ? new Date(String(body.registerDeadline))
                    : null
                  : undefined,
              hostTeamId:
                body.hostTeamId !== undefined
                  ? body.hostTeamId
                    ? String(body.hostTeamId)
                    : null
                  : undefined,
              cta:
                body.cta && typeof body.cta === "object"
                  ? (body.cta as {
                      register?: boolean;
                      btc?: boolean;
                      checkin?: boolean;
                    })
                  : undefined,
              externalEventId:
                body.externalEventId !== undefined
                  ? body.externalEventId == null
                    ? null
                    : String(body.externalEventId)
                  : undefined,
              startsAt:
                body.startsAt !== undefined
                  ? body.startsAt
                    ? new Date(String(body.startsAt))
                    : null
                  : undefined,
              endsAt:
                body.endsAt !== undefined
                  ? body.endsAt
                    ? new Date(String(body.endsAt))
                    : null
                  : undefined,
            }),
          };
        }
        case "join_activity":
          return {
            participantId: ops.joinActivity(user, String(body.activityId)),
          };
        case "get_activity":
          return {
            activity: ops.getActivity(user, String(body.activityId)),
          };
        case "activity_transition":
          ops.transitionActivity(
            user,
            String(body.activityId),
            String(body.to),
          );
          return { ok: true };
        case "register_document":
          assertRateLimit(user.id, "register_document");
          return {
            documentId: ops.registerDocumentMeta(user, clubId, {
              title: String(body.title),
              storageKey: String(body.storageKey),
              mimeType: String(body.mimeType ?? "application/octet-stream"),
              sizeBytes: Number(body.sizeBytes ?? 0),
            }),
          };
        case "soft_delete_document":
          ops.softDeleteDocument(user, String(body.documentId));
          return { ok: true };
        case "authorize_download":
          return {
            download: ops.authorizeDocumentDownload(
              user,
              String(body.documentId),
            ),
          };
        case "link_event":
          return {
            linkId: ops.linkSharedEvent(
              user,
              clubId,
              String(body.externalEventId),
              body.label ? String(body.label) : undefined,
            ),
          };
        case "unlink_event":
          ops.unlinkSharedEvent(user, String(body.linkId));
          return { ok: true };
        case "club_transition":
          throw new AppError(
            "NOT_SUPPORTED",
            "Không hỗ trợ giải tán / chuyển trạng thái giải tán câu lạc bộ",
            400,
          );
        default:
          throw new AppError("VALIDATION", `Unknown action ${action}`, 400);
      }
    });

    return NextResponse.json({ ok: true, ...result, correlationId });
  } catch (err) {
    const e = errorEnvelope(err, correlationId);
    if (e.status === 403) incMetric("club.http_403");
    if (e.status === 429) incMetric("club.http_429");
    logJson("error", "club.api.post", {
      correlationId,
      code: e.error.code,
      status: e.status,
    });
    return NextResponse.json(e, { status: e.status });
  }
}

export async function PUT() {
  const correlationId = newCorrelationId();
  try {
    const s = await getSession();
    return NextResponse.json({ ok: true, authenticated: !!s, correlationId });
  } catch (err) {
    const e = errorEnvelope(err, correlationId);
    return NextResponse.json(e, { status: e.status });
  }
}
