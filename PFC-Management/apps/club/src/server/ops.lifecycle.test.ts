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
import * as ops from "@/server/ops";
import { runClubJobs } from "@/platform/jobs";
import { RETENTION_MS } from "@/domain/data-class";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";

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

describe("G4 activity / documents / report ACL", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
  });

  it("activity FSM: draft → active → completed; illegal skip is 422", () => {
    const owner = insertUser("act-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Activity Club",
      visibility: "open",
    });
    const activityId = ops.createActivity(owner, club.id, {
      title: "Weekly sync",
    });

    expect(() => ops.transitionActivity(owner, activityId, "completed")).toThrow(
      /Illegal activity transition/,
    );
    try {
      ops.transitionActivity(owner, activityId, "completed");
    } catch (err) {
      expect((err as AppError).status).toBe(422);
    }

    ops.transitionActivity(owner, activityId, "active");
    ops.transitionActivity(owner, activityId, "completed");
    const rows = ops.listActivities(owner, club.id);
    expect(rows.find((a) => a.id === activityId)?.status).toBe("completed");
  });

  it("document register returns signed token; soft-delete hides from list", () => {
    const owner = insertUser("doc-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Docs Club",
      visibility: "private",
    });
    const documentId = ops.registerDocumentMeta(owner, club.id, {
      title: "Bylaws",
      storageKey: "local/club/bylaws.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
    });

    const listed = ops.listDocuments(owner, club.id);
    const row = listed.find((d) => d.id === documentId);
    expect(row).toBeTruthy();
    expect(row?.downloadToken).toBeTruthy();
    expect(
      Object.prototype.hasOwnProperty.call(row ?? {}, "storageKey"),
    ).toBe(false);

    const download = ops.authorizeDocumentDownload(owner, documentId);
    expect(download.storageKey).toBe("local/club/bylaws.pdf");
    expect(download.downloadToken.length).toBeGreaterThan(10);

    ops.softDeleteDocument(owner, documentId);
    expect(ops.listDocuments(owner, club.id).some((d) => d.id === documentId)).toBe(
      false,
    );
    expect(() => ops.authorizeDocumentDownload(owner, documentId)).toThrow(
      AppError,
    );
  });

  it("IDOR: outsider cannot list/download documents of private club", () => {
    const owner = insertUser("priv-doc@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Secret Docs",
      visibility: "private",
    });
    const documentId = ops.registerDocumentMeta(owner, club.id, {
      title: "Roster",
      storageKey: "local/club/roster.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    const stranger = insertUser("nosy@pfc.vn");

    expect(() => ops.listDocuments(stranger, club.id)).toThrow(AppError);
    expect(() => ops.authorizeDocumentDownload(stranger, documentId)).toThrow(
      AppError,
    );
    try {
      ops.listDocuments(stranger, club.id);
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
  });

  it("club report requires view_reports; member without perm gets 403", () => {
    const owner = insertUser("report-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Report Club",
      visibility: "open",
    });
    const member = insertUser("plain-member@pfc.vn");
    clubs.requestJoin(member, club.id);

    const report = clubs.clubReport(owner, club.id);
    expect(report.members.active).toBeGreaterThanOrEqual(1);
    expect(report.members.total).toBeGreaterThanOrEqual(1);

    expect(() => clubs.clubReport(member, club.id)).toThrow(AppError);
    try {
      clubs.clubReport(member, club.id);
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
  });

  it("jobs purge soft-deleted docs past retention", () => {
    const owner = insertUser("jobs-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Jobs Club",
      visibility: "open",
    });
    const documentId = ops.registerDocumentMeta(owner, club.id, {
      title: "Old",
      storageKey: "local/club/old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512,
    });
    ops.softDeleteDocument(owner, documentId);
    const ancient = new Date(Date.now() - RETENTION_MS - 60_000);
    db.update(documents)
      .set({ deletedAt: ancient })
      .where(eq(documents.id, documentId))
      .run();

    const result = runClubJobs();
    expect(result.purgedDocuments).toBeGreaterThanOrEqual(1);
    expect(
      db.select().from(documents).where(eq(documents.id, documentId)).all(),
    ).toHaveLength(0);
  });
});

describe("G5 event link harden + degrade", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
  });

  it("link / unlink shared event; no Event payload stored", () => {
    const owner = insertUser("evt-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Event Club",
      visibility: "open",
    });
    const linkId = ops.linkSharedEvent(
      owner,
      club.id,
      "ext-evt-100",
      "Kickoff",
    );
    const links = ops.listLinkedEvents(owner, club.id);
    const row = links.find((l) => l.id === linkId)!;
    expect(row.externalEventId).toBe("ext-evt-100");
    expect(row.label).toBe("Kickoff");
    expect(row.available).toBe(true);
    expect(row.degraded).toBe(false);
    expect(Object.keys(row).some((k) => /ticket|venue|price/i.test(k))).toBe(
      false,
    );

    ops.unlinkSharedEvent(owner, linkId);
    expect(ops.listLinkedEvents(owner, club.id).some((l) => l.id === linkId)).toBe(
      false,
    );
  });

  it("degrade when Shared Event engine marks id unavailable", () => {
    const owner = insertUser("deg-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Degrade Club",
      visibility: "open",
    });
    const alive = ops.linkSharedEvent(owner, club.id, "alive-1");
    const gone = ops.linkSharedEvent(owner, club.id, "gone-9");
    const links = ops.listLinkedEvents(owner, club.id, {
      unavailableEventIds: ["gone-9"],
    });
    expect(links.find((l) => l.id === alive)?.degraded).toBe(false);
    expect(links.find((l) => l.id === gone)?.degraded).toBe(true);
    expect(links.find((l) => l.id === gone)?.available).toBe(false);
  });

  it("IDOR: member of club A cannot link/unlink events on club B", () => {
    const a = insertUser("link-a@pfc.vn");
    const b = insertUser("link-b@pfc.vn");
    const clubA = clubs.createClub(a, { name: "A", visibility: "open" });
    const clubB = clubs.createClub(b, { name: "B", visibility: "open" });
    const linkB = ops.linkSharedEvent(b, clubB.id, "b-only");

    expect(() =>
      ops.linkSharedEvent(a, clubB.id, "intruder"),
    ).toThrow(AppError);
    expect(() => ops.unlinkSharedEvent(a, linkB)).toThrow(AppError);
    void clubA;
  });
});
