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
import * as privacy from "@/server/privacy";
import {
  listNotifications,
  notifyUser,
  upsertNotificationPreferences,
} from "@/platform/notify";
import { assertRateLimit, resetRateLimit } from "@/platform/rate-limit";
import { RATE_LIMIT_POLICIES } from "@/domain/rate-limit-policy";
import { resolveLocale, t } from "@/i18n/messages";
import { resetMetricsForTests, snapshotMetrics, incMetric } from "@/platform/metrics";

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

describe("G6 cross-cutting", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
    resetMetricsForTests();
  });

  it("CM-601 notify on private join request to owner", () => {
    const owner = insertUser("g6-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Notify Club",
      visibility: "private",
    });
    const applicant = insertUser("g6-join@pfc.vn");
    clubs.requestJoin(applicant, club.id, "I want to learn personal finance");
    const inbox = listNotifications(owner.id);
    expect(inbox.some((n) => n.type === "membership.join_requested")).toBe(
      true,
    );
  });

  it("CM-602 prefs can disable in-app delivery", () => {
    const user = insertUser("prefs@pfc.vn");
    upsertNotificationPreferences(user.id, { inApp: false, email: false });
    const sent = notifyUser({
      recipientId: user.id,
      type: "document.shared",
      title: "Doc",
    });
    expect(sent).toBeNull();
    expect(listNotifications(user.id)).toHaveLength(0);
  });

  it("CM-603 search excludes unauthorized private clubs", () => {
    const owner = insertUser("search-owner@pfc.vn");
    const stranger = insertUser("search-stranger@pfc.vn");
    clubs.createClub(owner, { name: "Secret Alpha", visibility: "private" });
    clubs.createClub(owner, { name: "Open Beta", visibility: "open" });
    const found = clubs.searchDiscoverableClubs(stranger, "alpha");
    expect(found.some((c) => c.name.includes("Secret"))).toBe(false);
    const open = clubs.searchDiscoverableClubs(stranger, "beta");
    expect(open.some((c) => c.name.includes("Open Beta"))).toBe(true);
  });

  it("CM-604 rate limit join_club after policy limit", () => {
    const actor = insertUser("rl@pfc.vn");
    resetRateLimit(actor.id, "join_club");
    const limit = RATE_LIMIT_POLICIES.join_club.limit;
    for (let i = 0; i < limit; i++) assertRateLimit(actor.id, "join_club");
    expect(() => assertRateLimit(actor.id, "join_club")).toThrow(AppError);
    try {
      assertRateLimit(actor.id, "join_club");
    } catch (err) {
      expect((err as AppError).status).toBe(429);
      expect((err as AppError).code).toBe("RATE_LIMITED");
    }
  });

  it("CM-605 i18n VI + EN catalogs", () => {
    expect(resolveLocale("en-US")).toBe("en");
    expect(t("error.rate_limited", "en")).toMatch(/Too many/i);
    expect(t("error.rate_limited", "vi")).toMatch(/quá nhanh/i);
  });

  it("CM-607 metrics counters increment", () => {
    incMetric("club.http_403", 2);
    const snap = snapshotMetrics();
    expect(snap["club.http_403"]).toBe(2);
  });

  it("CM-608 export + anonymize membership PII", () => {
    const owner = insertUser("pii-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "PII Club",
      visibility: "private",
    });
    const member = insertUser("pii-member@pfc.vn");
    const join = clubs.requestJoin(
      member,
      club.id,
      "Please admit me to the finance club",
    );
    clubs.transitionMembership(owner, join.id, "active");

    const exported = privacy.exportMembershipPii(member, join.id);
    expect(exported.member.email).toBe("pii-member@pfc.vn");
    expect(exported.membership.joinReason).toContain("finance");

    privacy.anonymizeMembershipPii(owner, join.id, "GDPR erase");
    const after = privacy.exportMembershipPii(owner, join.id);
    expect(after.member.email).toMatch(/@pfc\.invalid$/);
    expect(after.member.fullName).toBe("Deleted Member");
    expect(after.membership.joinReason).toBeNull();
    expect(after.membership.status).toBe("left");
  });

  it("CM-609 club report includes month buckets", () => {
    const owner = insertUser("analytics@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Analytics",
      visibility: "open",
    });
    const report = clubs.clubReport(owner, club.id);
    expect(report.members.joinedThisMonth).toBeGreaterThanOrEqual(1);
    expect(typeof report.tasks.doneThisMonth).toBe("number");
    expect(report.generatedAt).toBeTruthy();
  });
});
