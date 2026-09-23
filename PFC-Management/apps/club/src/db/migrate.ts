import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  members,
  clubs,
  memberships,
  teams,
  tasks,
  taskChecklistItems,
  activities,
  documents,
  clubEventLinks,
  auditEvents,
  membershipHistory,
  idempotencyKeys,
} from "./schema";
import { migrateUp } from "./migrator";
import { normalizeTeamName } from "@/domain/team-policy";

export { migrateUp, migrateDown, appliedMigrationVersions } from "./migrator";

function backfillTeamNameNormalized(): void {
  const rows = db.select().from(teams).all();
  for (const t of rows) {
    const n = normalizeTeamName(t.name);
    if (t.nameNormalized !== n) {
      db.update(teams)
        .set({ nameNormalized: n, updatedAt: new Date() })
        .where(eq(teams.id, t.id))
        .run();
    }
  }
}

export async function seedDemo(): Promise<void> {
  migrateUp();
  backfillTeamNameNormalized();
  const existing = db.select().from(members).where(eq(members.email, "leader@pfc.vn")).all();
  if (!existing.length) {
    await seedFreshClub();
  }
  // Always ensure role logins + PM/HR demo packs (idempotent) after migrate
  const { ensurePmDemoTasks } = await import("@/server/tasks");
  const { ensureHrDemoMembers } = await import("@/server/clubs");
  const { ensureRoleDemoAccounts } = await import("./role-demo-accounts");
  const primary = db.select().from(clubs).all()[0];
  if (primary) {
    ensureRoleDemoAccounts(primary.id);
    ensurePmDemoTasks(primary.id);
    ensureHrDemoMembers(primary.id);
  }
}

async function seedFreshClub(): Promise<void> {
  const existing = db.select().from(members).where(eq(members.email, "leader@pfc.vn")).all();
  if (existing.length) return;

  const leaderId = nanoid();
  const memberId = nanoid();
  const hash = bcrypt.hashSync("PFC123!", 10);

  db.insert(members)
    .values([
      {
        id: leaderId,
        email: "leader@pfc.vn",
        fullName: "Nguyen Phuong Linh",
        passwordHash: hash,
        isSuperAdmin: true,
      },
      {
        id: memberId,
        email: "member@pfc.vn",
        fullName: "Tran Minh Duc",
        passwordHash: hash,
        isSuperAdmin: false,
      },
    ])
    .run();

  const clubId = nanoid();
  db.insert(clubs)
    .values({
      id: clubId,
      name: "PFC — Personal Finance Club",
      slug: "pfc-investors",
      description:
        "Cộng đồng sinh viên học — thực hành — kết nối quanh tài chính cá nhân.",
      visibility: "private",
      status: "active",
      ownerId: leaderId,
    })
    .run();

  const teamId = nanoid();
  const teamTt = nanoid();
  const teamSk = nanoid();
  const now = new Date();
  db.insert(teams)
    .values([
      {
        id: teamId,
        clubId,
        name: "Ban Chuyên môn",
        nameNormalized: normalizeTeamName("Ban Chuyên môn"),
        description: "Research & content",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: teamTt,
        clubId,
        name: "Ban Truyền thông",
        nameNormalized: normalizeTeamName("Ban Truyền thông"),
        description: "Media & content",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: teamSk,
        clubId,
        name: "Ban Sự kiện",
        nameNormalized: normalizeTeamName("Ban Sự kiện"),
        description: "Events ops",
        createdAt: now,
        updatedAt: now,
      },
    ])
    .run();

  db.insert(memberships)
    .values([
      {
        id: nanoid(),
        clubId,
        memberId: leaderId,
        position: "owner",
        status: "active",
        teamId,
      },
      {
        id: nanoid(),
        clubId,
        memberId,
        position: "member",
        status: "active",
        teamId,
      },
    ])
    .run();

  const taskId = nanoid();
  db.insert(tasks)
    .values({
      id: taskId,
      clubId,
      title: "Chuan bi bai viet Vi tien sinh vien",
      description: "Outline + draft for content series",
      status: "todo",
      priority: "high",
      assigneeId: memberId,
      assignerId: leaderId,
      teamId,
      deadline: new Date(Date.now() + 7 * 86400000),
    })
    .run();

  db.insert(taskChecklistItems)
    .values([
      { id: nanoid(), taskId, title: "Outline", done: true, sortOrder: 0 },
      { id: nanoid(), taskId, title: "Draft", done: false, sortOrder: 1 },
      { id: nanoid(), taskId, title: "Review", done: false, sortOrder: 2 },
    ])
    .run();

  db.insert(activities)
    .values({
      id: nanoid(),
      clubId,
      title: "14-Day Spending Challenge",
      description: "Internal campaign (not Shared Event)",
      status: "active",
      kind: "internal",
      mode: "hybrid",
      location: "Online + Phòng CLB",
      bodyMd:
        "<h2>Thử thách 14 ngày</h2><p>Theo dõi chi tiêu mỗi ngày, <strong>chia sẻ tip</strong> với ban.</p><ul><li>Ngày 1–7: ghi nhật ký</li><li>Ngày 8–14: tối ưu ngân sách</li></ul><blockquote><p>Hoạt động nội bộ — không phải vé Shared Event.</p></blockquote>",
      coverUrl: "https://placehold.co/800x420/1e1633/fff?text=14-Day+Challenge",
      mediaJson: JSON.stringify([
        "https://placehold.co/800x420/1e1633/fff?text=14-Day+Challenge",
        "https://placehold.co/400x400/7a6bb0/fff?text=Gallery+1",
      ]),
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videosJson: JSON.stringify([
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ]),
      capacity: 50,
      registerDeadline: new Date(Date.now() + 1 * 86400000),
      hostTeamId: teamId,
      ctaJson: JSON.stringify({ register: true, btc: true, checkin: false }),
      ownerId: leaderId,
      startsAt: new Date(Date.now() + 2 * 86400000),
      endsAt: new Date(Date.now() + 16 * 86400000),
      updatedAt: new Date(),
    })
    .run();

  db.insert(documents)
    .values({
      id: nanoid(),
      clubId,
      title: "Club Ops Playbook.pdf",
      storageKey: `local/${clubId}/playbook.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
      uploadedBy: leaderId,
    })
    .run();

  db.insert(clubEventLinks)
    .values({
      id: nanoid(),
      clubId,
      externalEventId: "evt_shared_demo_001",
      label: "PFC Young Leaders Summit 2026 (Shared Event)",
      linkedBy: leaderId,
    })
    .run();

  // touch unused imports for typecheck stability if tree-shaken
  void auditEvents;
  void membershipHistory;
  void idempotencyKeys;
}
