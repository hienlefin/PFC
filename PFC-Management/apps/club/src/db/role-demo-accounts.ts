/**
 * Demo login accounts — one per ADR-003 position (+ pending for queue UI).
 * Password: PFC123! for all. Idempotent via email uniqueness.
 */
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { members, memberships, teams } from "./schema";
import {
  DEMO_PASSWORD,
  ROLE_DEMO_ACCOUNTS,
  type RoleDemoAccount,
} from "./role-demo-catalog";
import type { Position } from "@/domain/permissions";
import {
  normalizeTeamName,
  sanitizeTeamName,
} from "@/domain/team-policy";

export {
  DEMO_PASSWORD,
  ROLE_DEMO_ACCOUNTS,
  type RoleDemoAccount,
} from "./role-demo-catalog";

function ensureTeam(
  clubId: string,
  name: string,
  description: string,
): string {
  const normalized = normalizeTeamName(name);
  const existing = db
    .select()
    .from(teams)
    .where(and(eq(teams.clubId, clubId), eq(teams.nameNormalized, normalized)))
    .all()[0];
  if (existing) return existing.id;
  // Fallback for pre-migration rows without name_normalized
  const byName = db
    .select()
    .from(teams)
    .where(and(eq(teams.clubId, clubId), eq(teams.name, name)))
    .all()[0];
  if (byName) {
    db.update(teams)
      .set({ nameNormalized: normalized, updatedAt: new Date() })
      .where(eq(teams.id, byName.id))
      .run();
    return byName.id;
  }
  const id = nanoid();
  const now = new Date();
  db.insert(teams)
    .values({
      id,
      clubId,
      name: sanitizeTeamName(name),
      nameNormalized: normalized,
      description,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

/**
 * Ensure every ADR-003 role has a loginable demo account on the primary club.
 * Safe to call on every boot / `npm run db:seed`.
 */
/** Legacy unaccented duplicate from older seeds → Ban Điều hành. */
function healLegacyBanChuyenMon(clubId: string): void {
  const legacy = db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.clubId, clubId),
        eq(teams.nameNormalized, normalizeTeamName("Ban Chuyen mon")),
      ),
    )
    .all()[0];
  if (!legacy) return;

  const targetName = "Ban Điều hành";
  const targetNorm = normalizeTeamName(targetName);
  const existing = db
    .select()
    .from(teams)
    .where(and(eq(teams.clubId, clubId), eq(teams.nameNormalized, targetNorm)))
    .all()[0];

  if (!existing) {
    db.update(teams)
      .set({
        name: sanitizeTeamName(targetName),
        nameNormalized: targetNorm,
        description: "Ban điều hành / executive",
        updatedAt: new Date(),
      })
      .where(eq(teams.id, legacy.id))
      .run();
    return;
  }

  // Merge memberships onto existing Ban Điều hành, then drop legacy row.
  db.update(memberships)
    .set({ teamId: existing.id })
    .where(eq(memberships.teamId, legacy.id))
    .run();
  db.delete(teams).where(eq(teams.id, legacy.id)).run();
}

export function ensureRoleDemoAccounts(clubId: string): void {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 8);

  healLegacyBanChuyenMon(clubId);

  const teamCm = ensureTeam(clubId, "Ban Chuyên môn", "Research & learning");
  const teamTt = ensureTeam(clubId, "Ban Truyền thông", "Media & content");
  const teamSk = ensureTeam(clubId, "Ban Sự kiện", "Events ops");
  const teamDh = ensureTeam(clubId, "Ban Điều hành", "Ban điều hành / executive");
  const teamDn = ensureTeam(clubId, "Ban Đối ngoại", "Partnerships");

  const teamByName: Record<string, string> = {
    "Ban Chuyên môn": teamCm,
    "Ban Truyền thông": teamTt,
    "Ban Sự kiện": teamSk,
    "Ban Điều hành": teamDh,
    "Ban Đối ngoại": teamDn,
  };

  for (const acct of ROLE_DEMO_ACCOUNTS) {
    let user = db
      .select()
      .from(members)
      .where(eq(members.email, acct.email))
      .all()[0];

    if (!user) {
      const idTaken = db
        .select()
        .from(members)
        .where(eq(members.id, acct.id))
        .all()[0];
      const id = idTaken ? nanoid() : acct.id;
      db.insert(members)
        .values({
          id,
          email: acct.email,
          fullName: acct.fullName,
          passwordHash: hash,
          isSuperAdmin: acct.position === "owner",
        })
        .run();
      user = db
        .select()
        .from(members)
        .where(eq(members.email, acct.email))
        .all()[0]!;
    } else if (user.fullName !== acct.fullName) {
      db.update(members)
        .set({ fullName: acct.fullName })
        .where(eq(members.id, user.id))
        .run();
    }

    const teamId = acct.teamName ? (teamByName[acct.teamName] ?? null) : null;

    const ms = db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.clubId, clubId),
          eq(memberships.memberId, user.id),
        ),
      )
      .all()[0];

    if (!ms) {
      db.insert(memberships)
        .values({
          id: `role-ms-${acct.id.replace(/^role-demo-/, "")}`,
          clubId,
          memberId: user.id,
          position: acct.position,
          status: acct.status,
          teamId,
          effectiveFrom: new Date(Date.now() - 30 * 86400000),
        })
        .run();
      continue;
    }

    const patch: {
      position?: Position;
      status?: string;
      teamId?: string | null;
    } = {};
    if (ms.position !== acct.position) patch.position = acct.position;
    if (ms.status !== acct.status) patch.status = acct.status;
    if ((ms.teamId ?? null) !== teamId) patch.teamId = teamId;
    if (Object.keys(patch).length) {
      db.update(memberships)
        .set(patch)
        .where(eq(memberships.id, ms.id))
        .run();
    }
  }
}
