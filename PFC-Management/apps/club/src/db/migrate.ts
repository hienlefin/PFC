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

export { migrateUp, migrateDown, appliedMigrationVersions } from "./migrator";

export async function seedDemo(): Promise<void> {
  migrateUp();
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
  db.insert(teams)
    .values({
      id: teamId,
      clubId,
      name: "Ban Chuyen mon",
      description: "Research & content",
    })
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
      ownerId: leaderId,
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
