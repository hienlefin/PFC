import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const ts = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isSuperAdmin: integer("is_super_admin", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: ts("created_at"),
});

export const clubs = sqliteTable(
  "clubs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    visibility: text("visibility").notNull().default("private"), // open | private
    status: text("status").notNull().default("draft"), // draft|active|archived|disbanded
    coverUrl: text("cover_url"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => members.id),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("clubs_status_idx").on(t.status)],
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [index("teams_club_idx").on(t.clubId)],
);

/** Active membership + history via endedAt / append-only history table */
export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    position: text("position").notNull().default("member"),
    status: text("status").notNull().default("pending"),
    teamId: text("team_id").references(() => teams.id),
    effectiveFrom: integer("effective_from", { mode: "timestamp_ms" }),
    effectiveTo: integer("effective_to", { mode: "timestamp_ms" }),
    rejectReason: text("reject_reason"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    index("memberships_club_idx").on(t.clubId),
    index("memberships_member_idx").on(t.memberId),
    index("memberships_club_status_idx").on(t.clubId, t.status),
  ],
);

export const membershipHistory = sqliteTable("membership_history", {
  id: text("id").primaryKey(),
  membershipId: text("membership_id")
    .notNull()
    .references(() => memberships.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actorId: text("actor_id").references(() => members.id),
  note: text("note"),
  createdAt: ts("created_at"),
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("backlog"),
    priority: text("priority").notNull().default("medium"), // low|medium|high
    assigneeId: text("assignee_id").references(() => members.id),
    assignerId: text("assigner_id")
      .notNull()
      .references(() => members.id),
    teamId: text("team_id").references(() => teams.id),
    deadline: integer("deadline", { mode: "timestamp_ms" }),
    proofOfWork: text("proof_of_work"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    index("tasks_club_status_idx").on(t.clubId, t.status),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_deadline_idx").on(t.deadline),
  ],
);

export const taskChecklistItems = sqliteTable(
  "task_checklist_items",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: ts("created_at"),
  },
  (t) => [index("checklist_task_idx").on(t.taskId)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"), // draft|active|completed|archived
    ownerId: text("owner_id")
      .notNull()
      .references(() => members.id),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    createdAt: ts("created_at"),
  },
  (t) => [index("activities_club_idx").on(t.clubId)],
);

export const activityParticipants = sqliteTable(
  "activity_participants",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id),
    status: text("status").notNull().default("joined"), // joined|completed
    createdAt: ts("created_at"),
  },
  (t) => [index("activity_part_idx").on(t.activityId)],
);

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    classification: text("classification").notNull().default("confidential"),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => members.id),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt: ts("created_at"),
  },
  (t) => [index("documents_club_idx").on(t.clubId)],
);

/** Shared Event Engine link only — ADR-001 / FR-CLB-010 */
export const clubEventLinks = sqliteTable(
  "club_event_links",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    externalEventId: text("external_event_id").notNull(),
    label: text("label"),
    linkedBy: text("linked_by")
      .notNull()
      .references(() => members.id),
    linkedAt: ts("linked_at"),
  },
  (t) => [
    index("event_links_club_idx").on(t.clubId),
    index("event_links_ext_idx").on(t.externalEventId),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id"),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id"),
    result: text("result").notNull().default("ok"),
    metaJson: text("meta_json"),
    correlationId: text("correlation_id"),
    createdAt: ts("created_at"),
  },
  (t) => [index("audit_club_idx").on(t.clubId)],
);

export const idempotencyKeys = sqliteTable("idempotency_keys", {
  key: text("key").primaryKey(),
  responseJson: text("response_json").notNull(),
  createdAt: ts("created_at"),
});
