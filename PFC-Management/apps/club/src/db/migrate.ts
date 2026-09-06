import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, sqlite } from "./index";
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

/** Apply DDL (simple migrate-up for SQLite file). Rollback = delete file in dev. */
export function migrateUp(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_super_admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE TABLE IF NOT EXISTS clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'private',
      status TEXT NOT NULL DEFAULT 'draft',
      cover_url TEXT,
      owner_id TEXT NOT NULL REFERENCES members(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS clubs_status_idx ON clubs(status);
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS teams_club_idx ON teams(club_id);
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id),
      position TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'pending',
      team_id TEXT REFERENCES teams(id),
      effective_from INTEGER,
      effective_to INTEGER,
      reject_reason TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS memberships_club_idx ON memberships(club_id);
    CREATE INDEX IF NOT EXISTS memberships_member_idx ON memberships(member_id);
    CREATE INDEX IF NOT EXISTS memberships_club_status_idx ON memberships(club_id, status);
    CREATE TABLE IF NOT EXISTS membership_history (
      id TEXT PRIMARY KEY,
      membership_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      actor_id TEXT REFERENCES members(id),
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT REFERENCES members(id),
      assigner_id TEXT NOT NULL REFERENCES members(id),
      team_id TEXT REFERENCES teams(id),
      deadline INTEGER,
      proof_of_work TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS tasks_club_status_idx ON tasks(club_id, status);
    CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks(deadline);
    CREATE TABLE IF NOT EXISTS task_checklist_items (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS checklist_task_idx ON task_checklist_items(task_id);
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      owner_id TEXT NOT NULL REFERENCES members(id),
      starts_at INTEGER,
      ends_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS activities_club_idx ON activities(club_id);
    CREATE TABLE IF NOT EXISTS activity_participants (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id),
      status TEXT NOT NULL DEFAULT 'joined',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS activity_part_idx ON activity_participants(activity_id);
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      classification TEXT NOT NULL DEFAULT 'confidential',
      uploaded_by TEXT NOT NULL REFERENCES members(id),
      deleted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS documents_club_idx ON documents(club_id);
    CREATE TABLE IF NOT EXISTS club_event_links (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      external_event_id TEXT NOT NULL,
      label TEXT,
      linked_by TEXT NOT NULL REFERENCES members(id),
      linked_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS event_links_club_idx ON club_event_links(club_id);
    CREATE INDEX IF NOT EXISTS event_links_ext_idx ON club_event_links(external_event_id);
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      club_id TEXT,
      actor_id TEXT,
      action TEXT NOT NULL,
      object_type TEXT NOT NULL,
      object_id TEXT,
      result TEXT NOT NULL DEFAULT 'ok',
      meta_json TEXT,
      correlation_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS audit_club_idx ON audit_events(club_id);
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      response_json TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);
}

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
