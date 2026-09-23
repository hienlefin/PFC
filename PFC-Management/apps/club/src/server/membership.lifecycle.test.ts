import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db, sqlite } from "@/db";
import { members } from "@/db/schema";
import { migrateUp } from "@/db/migrate";
import { migrateDown } from "@/db/migrate-meta";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";
import * as clubs from "@/server/clubs";

function asUser(
  row: { id: string; email: string; fullName: string; isSuperAdmin: boolean },
): SessionUser {
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

describe("P4B membership lifecycle", () => {
  beforeEach(() => {
    migrateDown();
    migrateUp();
  });

  it("private join requires reason and records history", () => {
    const owner = insertUser("owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Private Club",
      visibility: "private",
    });
    const applicant = insertUser("join@pfc.vn");

    expect(() => clubs.requestJoin(applicant, club.id, "hi")).toThrow(AppError);

    const join = clubs.requestJoin(
      applicant,
      club.id,
      "I want to learn personal finance",
    );
    expect(join.status).toBe("pending");
    expect(join.joinReason).toContain("personal finance");

    const history = clubs.listMembershipHistory(owner, join.id);
    expect(history[0]?.toStatus).toBe("pending");
    expect(history[0]?.note).toContain("personal finance");
  });

  it("approve/reject with reason and append-only history", () => {
    const owner = insertUser("owner2@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "PFC Private",
      visibility: "private",
    });
    const applicant = insertUser("app@pfc.vn");
    const join = clubs.requestJoin(
      applicant,
      club.id,
      "Please let me into the club",
    );

    expect(() =>
      clubs.transitionMembership(owner, join.id, "rejected", "no"),
    ).toThrow(/Reject reason required/);

    clubs.transitionMembership(
      owner,
      join.id,
      "rejected",
      "Does not meet club criteria",
    );
    const hist = clubs.listMembershipHistory(owner, join.id);
    expect(hist.some((h) => h.toStatus === "rejected")).toBe(true);

    expect(() =>
      sqlite.exec(
        `UPDATE membership_history SET note = 'tamper' WHERE membership_id = '${join.id}'`,
      ),
    ).toThrow(/append-only/);

    expect(() =>
      sqlite.exec(
        `DELETE FROM membership_history WHERE membership_id = '${join.id}'`,
      ),
    ).toThrow(/append-only/);
  });

  it("approve then kick member writes left history", () => {
    const owner = insertUser("owner3@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Kick Club",
      visibility: "private",
    });
    const applicant = insertUser("kicked@pfc.vn");
    const join = clubs.requestJoin(
      applicant,
      club.id,
      "I want to contribute weekly",
    );
    clubs.transitionMembership(owner, join.id, "active");
    clubs.kickMember(owner, join.id, "Inactive for two months");
    const rows = clubs.listMembers(owner, club.id);
    const kicked = rows.find((r) => r.id === join.id);
    expect(kicked?.status).toBe("left");
  });

  it("cannot kick or demote the last owner", () => {
    const owner = insertUser("solo-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Solo",
      visibility: "private",
    });
    const ownerMembership = clubs
      .listMembers(owner, club.id)
      .find((m) => m.memberId === owner.id)!;

    const helper = insertUser("helper-leader@pfc.vn");
    const helperJoin = clubs.requestJoin(
      helper,
      club.id,
      "I will help operate the club",
    );
    clubs.transitionMembership(owner, helperJoin.id, "active");
    clubs.assignPosition(owner, helperJoin.id, "leader");

    expect(() =>
      clubs.assignPosition(owner, ownerMembership.id, "leader"),
    ).toThrow(/last active owner/);
    expect(() =>
      clubs.kickMember(helper, ownerMembership.id, "Trying to remove owner"),
    ).toThrow(/last active owner/);
  });

  it("transfer owner promotes target and demotes previous", () => {
    const owner = insertUser("from-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Transfer Club",
      visibility: "private",
    });
    const next = insertUser("to-owner@pfc.vn");
    const join = clubs.requestJoin(
      next,
      club.id,
      "Ready to lead the finance club",
    );
    clubs.transitionMembership(owner, join.id, "active");
    const result = clubs.transferOwner(owner, join.id);
    expect(result.ownerId).toBe(next.id);
    const rows = clubs.listMembers(next, club.id);
    expect(rows.find((r) => r.memberId === next.id)?.position).toBe("owner");
    expect(rows.find((r) => r.memberId === owner.id)?.position).toBe("leader");
  });

  it("IDOR: leader of club A cannot approve club B membership", () => {
    const a = insertUser("leader-a@pfc.vn");
    const b = insertUser("leader-b@pfc.vn");
    const clubA = clubs.createClub(a, { name: "Club A", visibility: "private" });
    const clubB = clubs.createClub(b, { name: "Club B", visibility: "private" });
    const applicant = insertUser("idor@pfc.vn");
    const joinB = clubs.requestJoin(
      applicant,
      clubB.id,
      "Joining B for IDOR test case",
    );
    expect(() => clubs.transitionMembership(a, joinB.id, "active")).toThrow(
      AppError,
    );
    try {
      clubs.transitionMembership(a, joinB.id, "active");
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
    void clubA;
  });

  it("403 private leak: outsider cannot list members", () => {
    const owner = insertUser("priv-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Secret",
      visibility: "private",
    });
    const stranger = insertUser("stranger@pfc.vn");
    expect(() => clubs.listMembers(stranger, club.id)).toThrow(AppError);
    expect(() => clubs.assertCanViewClub(stranger, club.id)).toThrow(
      /Private club/,
    );
    try {
      clubs.listMembers(stranger, club.id);
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
  });

  it("manual add + invite link + assign team + kick anonymizes PII", () => {
    const owner = insertUser("ops-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Ops Club",
      visibility: "private",
    });
    const teamId = clubs.createTeam(owner, club.id, {
      name: "Ban Truyen thong",
      description: "Content",
    });
    const recruit = insertUser("new-recruit@pfc.vn");
    const added = clubs.inviteOrAddMember(owner, club.id, {
      emailOrCode: "new-recruit@pfc.vn",
      position: "member",
      teamId,
    });
    expect(added.kind).toBe("added");
    if (added.kind !== "added") throw new Error("expected added");
    const row = clubs
      .listMembers(owner, club.id)
      .find((m) => m.id === added.membershipId);
    expect(row?.teamId).toBe(teamId);
    expect(row?.status).toBe("active");

    clubs.assignMemberTeam(owner, added.membershipId, null);
    expect(
      clubs.listMembers(owner, club.id).find((m) => m.id === added.membershipId)
        ?.teamId,
    ).toBeNull();

    const link = clubs.ensureInviteLink(owner, club.id);
    expect(link.code.length).toBeGreaterThanOrEqual(6);

    const viaLink = insertUser("via-link@pfc.vn");
    const joined = clubs.requestJoin(
      viaLink,
      club.id,
      undefined,
      link.code,
    );
    expect(joined.status).toBe("active");

    clubs.kickMember(owner, added.membershipId, "Inactive for two months");
    const after = clubs
      .listMembers(owner, club.id)
      .find((m) => m.id === added.membershipId);
    expect(after?.status).toBe("left");
    expect(after?.fullName).toBe("Deleted Member");
    expect(after?.email).toMatch(/deleted\+/);
  });

  it("team update and delete clears membership teamId", () => {
    const owner = insertUser("team-owner@pfc.vn");
    const club = clubs.createClub(owner, {
      name: "Team Club",
      visibility: "open",
    });
    const teamId = clubs.createTeam(owner, club.id, { name: "Ban Su kien" });
    clubs.updateTeam(owner, teamId, { name: "Ban Su Kien", description: "Events" });
    const member = insertUser("tm@pfc.vn");
    const join = clubs.requestJoin(member, club.id);
    clubs.assignMemberTeam(owner, join.id, teamId);
    clubs.deleteTeam(owner, teamId);
    expect(
      clubs.listMembers(owner, club.id).find((m) => m.id === join.id)?.teamId,
    ).toBeNull();
  });
});
