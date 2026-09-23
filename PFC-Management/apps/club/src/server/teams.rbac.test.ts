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

describe("team RBAC + case-insensitive names", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
  });

  it("rejects duplicate team names ignoring case", () => {
    const owner = insertUser("own-team@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Team Uniq",
      visibility: "open",
    });
    clubs.createTeam(owner, club.id, { name: "Ban Truyền thông" });
    expect(() =>
      clubs.createTeam(owner, club.id, { name: "  ban truyền Thông " }),
    ).toThrow(/đã tồn tại/);
  });

  it("only owner can create/delete teams (leader forbidden)", () => {
    const owner = insertUser("own2@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "RBAC Club",
      visibility: "open",
    });
    const lead = insertUser("lead2@pfc.vn");
    const join = clubs.requestJoin(lead, club.id);
    clubs.assignPosition(owner, join.id, "leader");

    expect(() =>
      clubs.createTeam(lead, club.id, { name: "Ban Mới" }),
    ).toThrow(AppError);

    const teamId = clubs.createTeam(owner, club.id, { name: "Ban Mới" });
    expect(() => clubs.deleteTeam(lead, teamId)).toThrow(AppError);
    clubs.deleteTeam(owner, teamId);
  });

  it("trưởng ban can assign only into their own team", () => {
    const owner = insertUser("own3@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Dept Club",
      visibility: "open",
    });
    const tt = clubs.createTeam(owner, club.id, { name: "Ban Truyền thông" });
    const cm = clubs.createTeam(owner, club.id, { name: "Ban Chuyên môn" });

    const head = insertUser("head-tt@pfc.vn");
    const headMs = clubs.requestJoin(head, club.id);
    clubs.assignPosition(owner, headMs.id, "ban_truyen_thong");
    const afterPos = clubs
      .listMembers(owner, club.id)
      .find((m) => m.id === headMs.id);
    expect(afterPos?.teamId).toBe(tt);

    const recruit = insertUser("recruit@pfc.vn");
    const recMs = clubs.requestJoin(recruit, club.id);

    clubs.assignMemberTeam(head, recMs.id, tt);
    expect(
      clubs.listMembers(owner, club.id).find((m) => m.id === recMs.id)?.teamId,
    ).toBe(tt);

    expect(() => clubs.assignMemberTeam(head, recMs.id, cm)).toThrow(
      /không có quyền/,
    );
    expect(() => clubs.assignMemberTeam(head, recMs.id, null)).toThrow(
      /không có quyền/,
    );
  });

  it("listTeams returns memberCount", () => {
    const owner = insertUser("own4@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Count Club",
      visibility: "open",
    });
    const tid = clubs.createTeam(owner, club.id, { name: "Ban Sự kiện" });
    const u = insertUser("sk-member@pfc.vn");
    const ms = clubs.requestJoin(u, club.id);
    clubs.assignMemberTeam(owner, ms.id, tid);
    const listed = clubs.listTeams(owner, club.id);
    const row = listed.find((t) => t.id === tid);
    expect(row?.memberCount).toBe(1);
  });
});
