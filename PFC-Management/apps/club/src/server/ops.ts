import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { activities, documents, clubEventLinks } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { requireClubPermission, requireSensitivePermission } from "@/lib/authz";
import { writeAudit, writeSensitiveAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";

export function listActivities(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_club");
  return db.select().from(activities).where(eq(activities.clubId, clubId)).all();
}

export function createActivity(
  user: SessionUser,
  clubId: string,
  input: { title: string; description?: string },
) {
  requireClubPermission(user, clubId, "manage_activities");
  const id = nanoid();
  db.insert(activities)
    .values({
      id,
      clubId,
      title: input.title,
      description: input.description ?? "",
      status: "draft",
      ownerId: user.id,
    })
    .run();
  writeAudit({
    clubId,
    actorId: user.id,
    action: "activity.create",
    objectType: "activity",
    objectId: id,
  });
  return id;
}

export function listDocuments(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_club");
  return db
    .select()
    .from(documents)
    .where(eq(documents.clubId, clubId))
    .all()
    .filter((d) => !d.deletedAt);
}

export function registerDocumentMeta(
  user: SessionUser,
  clubId: string,
  input: { title: string; storageKey: string; mimeType: string; sizeBytes: number },
) {
  requireClubPermission(user, clubId, "manage_documents");
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
  return id;
}

export function softDeleteDocument(user: SessionUser, documentId: string) {
  const doc = db.select().from(documents).where(eq(documents.id, documentId)).all()[0];
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

export function listLinkedEvents(user: SessionUser, clubId: string) {
  requireClubPermission(user, clubId, "view_club");
  return db
    .select()
    .from(clubEventLinks)
    .where(eq(clubEventLinks.clubId, clubId))
    .all();
}
