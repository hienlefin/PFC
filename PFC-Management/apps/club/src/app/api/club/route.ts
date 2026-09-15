import { NextResponse } from "next/server";
import { seedDemo } from "@/db/migrate";
import { login, logout, requireSession, getSession, newCorrelationId } from "@/lib/auth";
import { errorEnvelope, AppError } from "@/lib/errors";
import { withIdempotency } from "@/lib/audit";
import * as clubs from "@/server/clubs";
import * as tasks from "@/server/tasks";
import * as ops from "@/server/ops";

seedDemo().catch(console.error);

type Body = Record<string, unknown>;

async function parseBody(req: Request): Promise<Body> {
  try {
    return (await req.json()) as Body;
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const correlationId = newCorrelationId();
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "health";

    if (action === "health") {
      return NextResponse.json({
        ok: true,
        service: "pfc-club-management",
        correlationId,
      });
    }

    if (action === "bootstrap") {
      await seedDemo();
      return NextResponse.json({ ok: true, seeded: true, correlationId });
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

    const primary = clubs.getPrimaryClub();
    const clubId = url.searchParams.get("clubId") ?? primary.id;
    clubs.assertCanViewClub(user, clubId);

    if (action === "home") {
      return NextResponse.json({
        ok: true,
        club: clubs.getClubOrThrow(clubId),
        teams: clubs.listTeams(clubId),
        report: clubs.clubReport(user, clubId),
        members: clubs.listMembers(user, clubId),
        kanban: tasks.kanbanBoard(user, clubId),
        timeline: tasks.timelineTasks(user, clubId),
        activities: ops.listActivities(user, clubId),
        documents: ops.listDocuments(user, clubId),
        links: ops.listLinkedEvents(user, clubId),
        correlationId,
      });
    }

    switch (action) {
      case "club":
        return NextResponse.json({
          ok: true,
          club: clubs.getClubOrThrow(clubId),
          teams: clubs.listTeams(clubId),
          correlationId,
        });
      case "members":
        return NextResponse.json({
          ok: true,
          members: clubs.listMembers(user, clubId),
          correlationId,
        });
      case "tasks":
        return NextResponse.json({
          ok: true,
          tasks: tasks.listTasks(user, clubId),
          kanban: tasks.kanbanBoard(user, clubId),
          timeline: tasks.timelineTasks(user, clubId),
          correlationId,
        });
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
      case "documents":
        return NextResponse.json({
          ok: true,
          documents: ops.listDocuments(user, clubId),
          correlationId,
        });
      case "events":
        return NextResponse.json({
          ok: true,
          links: ops.listLinkedEvents(user, clubId),
          correlationId,
        });
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

    const user = await requireSession();

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
          return { join: clubs.requestJoin(user, clubId) };
        case "membership_transition":
          clubs.transitionMembership(
            user,
            String(body.membershipId),
            body.to as never,
            body.note ? String(body.note) : undefined,
          );
          return { ok: true };
        case "assign_position":
          clubs.assignPosition(
            user,
            String(body.membershipId),
            body.position as never,
          );
          return { ok: true };
        case "create_team":
          return {
            teamId: clubs.createTeam(user, clubId, {
              name: String(body.name),
              description: body.description ? String(body.description) : undefined,
            }),
          };
        case "create_task":
          return {
            taskId: tasks.createTask(user, clubId, {
              title: String(body.title),
              description: body.description ? String(body.description) : undefined,
              assigneeId: body.assigneeId ? String(body.assigneeId) : undefined,
              priority: body.priority ? String(body.priority) : undefined,
              deadline: body.deadline ? new Date(String(body.deadline)) : null,
            }),
          };
        case "task_transition":
          tasks.transitionTask(
            user,
            String(body.taskId),
            body.to as never,
            body.proofOfWork ? String(body.proofOfWork) : undefined,
          );
          return { ok: true };
        case "add_checklist":
          return {
            itemId: tasks.addChecklistItem(
              user,
              String(body.taskId),
              String(body.title),
            ),
          };
        case "toggle_checklist":
          tasks.toggleChecklistItem(
            user,
            String(body.itemId),
            Boolean(body.done),
          );
          return { ok: true };
        case "create_activity":
          return {
            activityId: ops.createActivity(user, clubId, {
              title: String(body.title),
              description: body.description ? String(body.description) : undefined,
            }),
          };
        case "register_document":
          return {
            documentId: ops.registerDocumentMeta(user, clubId, {
              title: String(body.title),
              storageKey: String(body.storageKey),
              mimeType: String(body.mimeType ?? "application/octet-stream"),
              sizeBytes: Number(body.sizeBytes ?? 0),
            }),
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
    return NextResponse.json(e, { status: e.status });
  }
}

export async function PUT() {
  const s = await getSession();
  return NextResponse.json({ ok: true, authenticated: !!s });
}
