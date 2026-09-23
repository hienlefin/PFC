import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { members } from "@/db/schema";
import { migrateUp } from "@/db/migrate";
import { migrateDown } from "@/db/migrate-meta";
import type { SessionUser } from "@/lib/auth";
import * as clubs from "@/server/clubs";
import * as tasks from "@/server/tasks";
import * as ops from "@/server/ops";
import { listNotifications } from "@/platform/notify";
import { runClubJobs } from "@/platform/jobs";

/**
 * CM-701 — critical Club path without browser E2E.
 * Leader approves → assigns task → member PoW → review done → doc → event link.
 */
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

const PROOF = {
  storageKey: "local/club/g7-pow.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
};

describe("G7 CM-701 critical path", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
  });

  it("join → approve → task review done → doc → event link", () => {
    const leader = insertUser("g7-leader@pfc.vn", true);
    const club = clubs.createClub(leader, {
      name: "G7 Critical",
      visibility: "private",
    });
    const member = insertUser("g7-member@pfc.vn");

    const join = clubs.requestJoin(
      member,
      club.id,
      "I want to contribute to the finance club",
    );
    expect(join.status).toBe("pending");
    expect(
      listNotifications(leader.id).some(
        (n) => n.type === "membership.join_requested",
      ),
    ).toBe(true);

    clubs.transitionMembership(leader, join.id, "active");
    expect(
      listNotifications(member.id).some((n) => n.type === "membership.approved"),
    ).toBe(true);

    const taskId = tasks.createTask(leader, club.id, {
      title: "Prepare weekly brief",
      assigneeId: member.id,
      deadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    tasks.transitionTask(member, taskId, "todo");
    tasks.transitionTask(member, taskId, "in_progress");
    tasks.attachProofOfWork(member, taskId, PROOF);
    tasks.transitionTask(member, taskId, "review");
    const reviewed = tasks.reviewTask(leader, taskId, "approve");
    expect(reviewed.to).toBe("done");

    const documentId = ops.registerDocumentMeta(leader, club.id, {
      title: "Brief template",
      storageKey: "local/club/brief.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    const download = ops.authorizeDocumentDownload(member, documentId);
    expect(download.downloadToken.length).toBeGreaterThan(10);

    const linkId = ops.linkSharedEvent(leader, club.id, "evt-g7-1", "Townhall");
    const links = ops.listLinkedEvents(leader, club.id, {
      unavailableEventIds: [],
    });
    expect(links.some((l) => l.id === linkId && l.available)).toBe(true);

    const report = clubs.clubReport(leader, club.id);
    expect(report.members.active).toBeGreaterThanOrEqual(2);
    expect(report.tasks.byStatus.done).toBeGreaterThanOrEqual(1);

    const jobs = runClubJobs();
    expect(Array.isArray(jobs.dueTaskReminders)).toBe(true);
  });
});
