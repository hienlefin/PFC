import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { activities, documents, clubEventLinks, clubs, activityParticipants, teams } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { requireClubPermission, requireSensitivePermission } from "@/lib/authz";
import { writeAudit, writeSensitiveAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import { assertDocumentUpload } from "@/domain/storage-policy";
import { clubFlags } from "@/platform/flags";
import { signStorageKey } from "@/platform/storage";
import { notifyUser } from "@/platform/notify";
import { t } from "@/i18n/messages";

const ACTIVITY_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "archived"],
  active: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

export function listActivities(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_club");
  const rows = db
    .select()
    .from(activities)
    .where(eq(activities.clubId, clubId))
    .all();
  const parts = db.select().from(activityParticipants).all();
  const countBy = new Map<string, number>();
  for (const p of parts) {
    countBy.set(p.activityId, (countBy.get(p.activityId) ?? 0) + 1);
  }
  return rows.map((row) => ({
    ...serializeActivity(row),
    participantCount: countBy.get(row.id) ?? 0,
  }));
}

export type ActivityCta = {
  register?: boolean;
  btc?: boolean;
  checkin?: boolean;
};

export type ActivityInput = {
  title: string;
  description?: string;
  kind?: "internal" | "linked";
  location?: string | null;
  mode?: "offline" | "online" | "hybrid";
  coverUrl?: string | null;
  bodyMd?: string;
  videoUrl?: string | null;
  mediaUrls?: string[];
  videoEmbeds?: string[];
  capacity?: number | null;
  registerDeadline?: Date | null;
  hostTeamId?: string | null;
  cta?: ActivityCta;
  externalEventId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  status?: "draft" | "active";
};

function parseCta(raw: string | null | undefined): ActivityCta {
  if (!raw) return { register: true };
  try {
    const v = JSON.parse(raw) as ActivityCta;
    return {
      register: v.register !== false,
      btc: !!v.btc,
      checkin: !!v.checkin,
    };
  } catch {
    return { register: true };
  }
}

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && !!x.trim())
      : [];
  } catch {
    return [];
  }
}

function normalizeUrlList(list: string[] | undefined | null): string[] {
  if (!list?.length) return [];
  return [
    ...new Set(
      list.map((u) => u.trim()).filter((u) => u.length > 0),
    ),
  ].slice(0, 24);
}

function serializeActivity(row: typeof activities.$inferSelect) {
  const mediaUrls = parseStringArray(row.mediaJson);
  const videoEmbeds = parseStringArray(row.videosJson);
  const cover =
    row.coverUrl ||
    mediaUrls[0] ||
    null;
  const videoUrl = row.videoUrl || videoEmbeds[0] || null;
  return {
    id: row.id,
    clubId: row.clubId,
    title: row.title,
    description: row.description,
    status: row.status,
    kind: (row.kind as "internal" | "linked") || "internal",
    location: row.location,
    mode: (row.mode as "offline" | "online" | "hybrid") || "offline",
    coverUrl: cover,
    bodyMd: row.bodyMd || row.description || "",
    videoUrl,
    mediaUrls: mediaUrls.length
      ? mediaUrls
      : cover
        ? [cover]
        : [],
    videoEmbeds: videoEmbeds.length
      ? videoEmbeds
      : videoUrl
        ? [videoUrl]
        : [],
    capacity: row.capacity ?? null,
    registerDeadline: row.registerDeadline ?? null,
    hostTeamId: row.hostTeamId ?? null,
    cta: parseCta(row.ctaJson),
    externalEventId: row.externalEventId,
    ownerId: row.ownerId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

function assertActivityInput(input: ActivityInput) {
  const title = input.title?.trim() ?? "";
  if (!title) {
    throw new AppError("VALIDATION", "Tên sự kiện / hoạt động không được trống", 400);
  }
  const kind = input.kind ?? "internal";
  if (kind !== "internal" && kind !== "linked") {
    throw new AppError("VALIDATION", "Loại không hợp lệ", 400);
  }
  const mode = input.mode ?? "offline";
  if (!["offline", "online", "hybrid"].includes(mode)) {
    throw new AppError("VALIDATION", "Hình thức không hợp lệ", 400);
  }
  if (kind === "linked") {
    const ext = input.externalEventId?.trim();
    if (!ext) {
      throw new AppError(
        "VALIDATION",
        "Sự kiện liên kết cần externalEventId từ Shared Event Hub",
        400,
      );
    }
  }
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    throw new AppError("VALIDATION", "Thời gian kết thúc phải sau thời gian bắt đầu", 400);
  }
  if (
    input.registerDeadline &&
    input.startsAt &&
    input.registerDeadline > input.startsAt
  ) {
    // Allow equal; warn only if after start — soft rule: deadline can be before start
  }
  if (input.capacity != null && (input.capacity < 1 || input.capacity > 100_000)) {
    throw new AppError("VALIDATION", "Chỉ tiêu tham gia không hợp lệ", 400);
  }
  return { title, kind, mode };
}

function mediaFieldsFromInput(input: ActivityInput) {
  const mediaUrls = normalizeUrlList(input.mediaUrls);
  const videoEmbeds = normalizeUrlList(
    input.videoEmbeds ??
      (input.videoUrl ? [input.videoUrl] : undefined),
  );
  const coverUrl =
    input.coverUrl?.trim() ||
    mediaUrls[0] ||
    null;
  const withCover =
    coverUrl && !mediaUrls.includes(coverUrl)
      ? [coverUrl, ...mediaUrls]
      : mediaUrls.length
        ? mediaUrls
        : coverUrl
          ? [coverUrl]
          : [];
  return {
    mediaUrls: withCover,
    videoEmbeds,
    coverUrl,
    videoUrl: videoEmbeds[0] ?? null,
  };
}

export function createActivity(
  user: SessionUser,
  clubId: string,
  input: ActivityInput,
) {
  const { title, kind, mode } = assertActivityInput(input);
  if (kind === "linked") {
    requireClubPermission(user, clubId, "link_events");
  } else {
    requireClubPermission(user, clubId, "manage_activities");
  }

  if (input.hostTeamId) {
    const team = db
      .select()
      .from(teams)
      .where(eq(teams.id, input.hostTeamId))
      .all()[0];
    if (!team || team.clubId !== clubId) {
      throw new AppError("NOT_FOUND", "Ban tổ chức không hợp lệ", 404);
    }
  }

  const id = nanoid();
  const bodyMd = (input.bodyMd ?? input.description ?? "").trim();
  const cta: ActivityCta = {
    register: input.cta?.register !== false,
    btc: !!input.cta?.btc,
    checkin: !!input.cta?.checkin,
  };
  const status = input.status === "active" ? "active" : "draft";
  const now = new Date();
  const externalEventId =
    kind === "linked" ? input.externalEventId!.trim() : null;
  const media = mediaFieldsFromInput(input);

  db.insert(activities)
    .values({
      id,
      clubId,
      title,
      description:
        input.description?.trim() ||
        bodyMd.replace(/<[^>]+>/g, "").slice(0, 280),
      status,
      kind,
      location: input.location?.trim() || null,
      mode,
      coverUrl: media.coverUrl,
      bodyMd,
      videoUrl: media.videoUrl,
      mediaJson: JSON.stringify(media.mediaUrls),
      videosJson: JSON.stringify(media.videoEmbeds),
      capacity: input.capacity ?? null,
      registerDeadline: input.registerDeadline ?? null,
      hostTeamId: input.hostTeamId ?? null,
      ctaJson: JSON.stringify(cta),
      externalEventId,
      ownerId: user.id,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      updatedAt: now,
    })
    .run();

  if (kind === "linked" && externalEventId) {
    db.insert(clubEventLinks)
      .values({
        id: nanoid(),
        clubId,
        externalEventId,
        label: title,
        linkedBy: user.id,
      })
      .run();
    writeAudit({
      clubId,
      actorId: user.id,
      action: "event.link",
      objectType: "club_event_link",
      objectId: id,
      meta: { externalEventId, via: "activity_post" },
    });
  }

  writeAudit({
    clubId,
    actorId: user.id,
    action: "activity.create",
    objectType: "activity",
    objectId: id,
    meta: { kind, status },
  });
  return id;
}

export function updateActivity(
  user: SessionUser,
  activityId: string,
  input: Partial<ActivityInput>,
) {
  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .all()[0];
  if (!activity) throw new AppError("NOT_FOUND", "Activity not found", 404);

  const nextKind = (input.kind ?? activity.kind ?? "internal") as
    | "internal"
    | "linked";
  if (nextKind === "linked") {
    requireClubPermission(user, activity.clubId, "link_events");
  } else {
    requireClubPermission(user, activity.clubId, "manage_activities");
  }

  const prevMedia = parseStringArray(activity.mediaJson);
  const prevVideos = parseStringArray(activity.videosJson);

  const merged: ActivityInput = {
    title: input.title ?? activity.title,
    description: input.description ?? activity.description,
    kind: nextKind,
    location: input.location !== undefined ? input.location : activity.location,
    mode: (input.mode ??
      (activity.mode as ActivityInput["mode"]) ??
      "offline") as ActivityInput["mode"],
    coverUrl: input.coverUrl !== undefined ? input.coverUrl : activity.coverUrl,
    bodyMd: input.bodyMd ?? activity.bodyMd ?? "",
    videoUrl: input.videoUrl !== undefined ? input.videoUrl : activity.videoUrl,
    mediaUrls:
      input.mediaUrls !== undefined ? input.mediaUrls : prevMedia,
    videoEmbeds:
      input.videoEmbeds !== undefined ? input.videoEmbeds : prevVideos,
    capacity:
      input.capacity !== undefined ? input.capacity : activity.capacity,
    registerDeadline:
      input.registerDeadline !== undefined
        ? input.registerDeadline
        : activity.registerDeadline,
    hostTeamId:
      input.hostTeamId !== undefined
        ? input.hostTeamId
        : activity.hostTeamId,
    cta: input.cta ?? parseCta(activity.ctaJson),
    externalEventId:
      input.externalEventId !== undefined
        ? input.externalEventId
        : activity.externalEventId,
    startsAt:
      input.startsAt !== undefined ? input.startsAt : activity.startsAt,
    endsAt: input.endsAt !== undefined ? input.endsAt : activity.endsAt,
  };
  const { title, kind, mode } = assertActivityInput(merged);
  const bodyMd = (merged.bodyMd ?? "").trim();
  const cta = merged.cta ?? { register: true };
  const media = mediaFieldsFromInput(merged);

  if (merged.hostTeamId) {
    const team = db
      .select()
      .from(teams)
      .where(eq(teams.id, merged.hostTeamId))
      .all()[0];
    if (!team || team.clubId !== activity.clubId) {
      throw new AppError("NOT_FOUND", "Ban tổ chức không hợp lệ", 404);
    }
  }

  db.update(activities)
    .set({
      title,
      description:
        merged.description?.trim() ||
        bodyMd.replace(/<[^>]+>/g, "").slice(0, 280),
      kind,
      location: merged.location?.trim() || null,
      mode,
      coverUrl: media.coverUrl,
      bodyMd,
      videoUrl: media.videoUrl,
      mediaJson: JSON.stringify(media.mediaUrls),
      videosJson: JSON.stringify(media.videoEmbeds),
      capacity: merged.capacity ?? null,
      registerDeadline: merged.registerDeadline ?? null,
      hostTeamId: merged.hostTeamId ?? null,
      ctaJson: JSON.stringify({
        register: cta.register !== false,
        btc: !!cta.btc,
        checkin: !!cta.checkin,
      }),
      externalEventId:
        kind === "linked" ? merged.externalEventId!.trim() : null,
      startsAt: merged.startsAt ?? null,
      endsAt: merged.endsAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, activityId))
    .run();

  writeAudit({
    clubId: activity.clubId,
    actorId: user.id,
    action: "activity.update",
    objectType: "activity",
    objectId: activityId,
    meta: { kind },
  });
  return serializeActivity(
    db.select().from(activities).where(eq(activities.id, activityId)).all()[0]!,
  );
}

export function getActivity(user: SessionUser, activityId: string) {
  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .all()[0];
  if (!activity) throw new AppError("NOT_FOUND", "Activity not found", 404);
  requireClubPermission(user, activity.clubId, "view_club");
  const participants = db
    .select()
    .from(activityParticipants)
    .where(eq(activityParticipants.activityId, activityId))
    .all();
  return {
    ...serializeActivity(activity),
    participantCount: participants.length,
    joined: participants.some((p) => p.memberId === user.id),
  };
}

export function joinActivity(user: SessionUser, activityId: string) {
  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .all()[0];
  if (!activity) throw new AppError("NOT_FOUND", "Activity not found", 404);
  requireClubPermission(user, activity.clubId, "view_club");
  if (activity.status !== "active") {
    throw new AppError(
      "VALIDATION",
      "Chỉ đăng ký được khi hoạt động đang active",
      400,
    );
  }
  if (
    activity.registerDeadline &&
    activity.registerDeadline.getTime() < Date.now()
  ) {
    throw new AppError("VALIDATION", "Đã hết hạn đăng ký", 400);
  }
  const participants = db
    .select()
    .from(activityParticipants)
    .where(eq(activityParticipants.activityId, activityId))
    .all();
  if (
    activity.capacity != null &&
    participants.length >= activity.capacity
  ) {
    throw new AppError("VALIDATION", "Đã đủ chỉ tiêu tham gia", 400);
  }
  const existing = participants.find((p) => p.memberId === user.id);
  if (existing) return existing.id;
  const id = nanoid();
  db.insert(activityParticipants)
    .values({
      id,
      activityId,
      memberId: user.id,
      status: "joined",
    })
    .run();
  writeAudit({
    clubId: activity.clubId,
    actorId: user.id,
    action: "activity.join",
    objectType: "activity",
    objectId: activityId,
  });
  return id;
}

export function transitionActivity(
  user: SessionUser,
  activityId: string,
  to: string,
) {
  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .all()[0];
  if (!activity) throw new AppError("NOT_FOUND", "Activity not found", 404);
  requireClubPermission(user, activity.clubId, "manage_activities");
  const allowed = ACTIVITY_TRANSITIONS[activity.status] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      "ILLEGAL_TRANSITION",
      `Illegal activity transition: ${activity.status} → ${to}`,
      422,
    );
  }
  db.update(activities)
    .set({ status: to })
    .where(eq(activities.id, activityId))
    .run();
  writeAudit({
    clubId: activity.clubId,
    actorId: user.id,
    action: "activity.transition",
    objectType: "activity",
    objectId: activityId,
    meta: { from: activity.status, to },
  });
  if (to === "active" || to === "completed") {
    const club = db
      .select()
      .from(clubs)
      .where(eq(clubs.id, activity.clubId))
      .all()[0];
    if (club?.ownerId && club.ownerId !== user.id) {
      notifyUser({
        recipientId: club.ownerId,
        clubId: activity.clubId,
        type: "activity.updated",
        title: t("notify.activity_updated"),
        body: `${activity.title} → ${to}`,
        payload: { activityId, to },
      });
    }
  }
}

export function listDocuments(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_club");
  const flags = clubFlags();
  return db
    .select()
    .from(documents)
    .where(eq(documents.clubId, clubId))
    .all()
    .filter((d) => !d.deletedAt)
    .map((d) => ({
      id: d.id,
      title: d.title,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      classification: d.classification,
      // Never return raw storageKey to clients
      downloadToken: flags.signedDownload
        ? signStorageKey(d.storageKey)
        : undefined,
    }));
}

export function registerDocumentMeta(
  user: SessionUser,
  clubId: string,
  input: {
    title: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
  },
) {
  requireClubPermission(user, clubId, "manage_documents");
  assertDocumentUpload({
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    virusScan: "skipped_dev",
  });
  const id = nanoid();
  db.insert(documents)
    .values({
      id,
      clubId,
      title: input.title,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedBy: user.id,
      classification: "confidential",
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "document.create",
    objectType: "document",
    objectId: id,
  });
  const club = db.select().from(clubs).where(eq(clubs.id, clubId)).all()[0];
  if (club?.ownerId && club.ownerId !== user.id) {
    notifyUser({
      recipientId: club.ownerId,
      clubId,
      type: "document.shared",
      title: t("notify.document_shared"),
      body: input.title,
      payload: { documentId: id },
    });
  }
  return id;
}

export function softDeleteDocument(user: SessionUser, documentId: string) {
  const doc = db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .all()[0];
  if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
  const spec = {
    action: "document.soft_delete",
    resourceType: "document",
    resourceId: documentId,
  };
  const { bypass } = requireSensitivePermission(
    user,
    doc.clubId,
    "manage_documents",
    spec,
  );
  sqlite.transaction(() => {
    db.update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, documentId))
      .run();
    writeSensitiveAudit({
      actorId: user.id,
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: documentId,
      clubId: doc.clubId,
      result: "allow",
      bypass,
      metadata: {},
    });
  })();
}

/** Resolve download: member of doc's club only; returns storage key from signed token. */
export function authorizeDocumentDownload(
  user: SessionUser,
  documentId: string,
): { storageKey: string; downloadToken: string } {
  const doc = db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .all()[0];
  if (!doc || doc.deletedAt) {
    throw new AppError("NOT_FOUND", "Document not found", 404);
  }
  requireClubPermission(user, doc.clubId, "view_club");
  return {
    storageKey: doc.storageKey,
    downloadToken: signStorageKey(doc.storageKey),
  };
}

/** FR-CLB-010 — link only, no Event payload */
export function linkSharedEvent(
  user: SessionUser,
  clubId: string,
  externalEventId: string,
  label?: string,
) {
  requireClubPermission(user, clubId, "link_events");
  const id = nanoid();
  db.insert(clubEventLinks)
    .values({
      id,
      clubId,
      externalEventId,
      label: label ?? null,
      linkedBy: user.id,
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "event.link",
    objectType: "club_event_link",
    objectId: id,
    meta: { externalEventId },
  });
  return id;
}

export function unlinkSharedEvent(user: SessionUser, linkId: string) {
  const link = db
    .select()
    .from(clubEventLinks)
    .where(eq(clubEventLinks.id, linkId))
    .all()[0];
  if (!link) throw new AppError("NOT_FOUND", "Event link not found", 404);
  requireClubPermission(user, link.clubId, "link_events");
  db.delete(clubEventLinks).where(eq(clubEventLinks.id, linkId)).run();
  writeAudit({
    clubId: link.clubId,
    actorId: user.id,
    action: "event.unlink",
    objectType: "club_event_link",
    objectId: linkId,
    meta: { externalEventId: link.externalEventId },
  });
}

/**
 * List linked events with fail-soft degrade when Shared Event engine
 * marks an id as missing (passed via optional unavailable set / stub).
 */
export function listLinkedEvents(
  user: SessionUser,
  clubId: string,
  opts?: { unavailableEventIds?: Set<string> | string[] },
) {
  requireClubPermission(user, clubId, "view_club");
  const unavailable = new Set(
    opts?.unavailableEventIds
      ? [...opts.unavailableEventIds]
      : [],
  );
  return db
    .select()
    .from(clubEventLinks)
    .where(eq(clubEventLinks.clubId, clubId))
    .all()
    .map((l) => ({
      id: l.id,
      clubId: l.clubId,
      externalEventId: l.externalEventId,
      label: l.label,
      linkedBy: l.linkedBy,
      linkedAt: l.linkedAt,
      available: !unavailable.has(l.externalEventId),
      degraded: unavailable.has(l.externalEventId),
    }));
}
