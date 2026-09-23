import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
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

/** ADR-008 — Platform Core SSO subject ↔ Club member */
export const memberPlatformIds = sqliteTable("member_platform_ids", {
  memberId: text("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  platformMemberId: text("platform_member_id").notNull().unique(),
  linkedAt: ts("linked_at"),
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
    /** lower(trim(name)) — unique per club (case-insensitive) */
    nameNormalized: text("name_normalized"),
    description: text("description").notNull().default(""),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    index("teams_club_idx").on(t.clubId),
    uniqueIndex("teams_club_name_norm_uidx").on(t.clubId, t.nameNormalized),
  ],
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
    joinReason: text("join_reason"),
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
    /** Optional linked Club Activity id (≠ Hub Event — ADR-008). */
    activityId: text("activity_id"),
    deadline: integer("deadline", { mode: "timestamp_ms" }),
    proofOfWork: text("proof_of_work"),
    /** 0–100 checklist / manual progress (CM task board) */
    progress: integer("progress").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    index("tasks_club_status_idx").on(t.clubId, t.status),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_deadline_idx").on(t.deadline),
    index("tasks_team_idx").on(t.teamId),
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
    /** Sub-task assignee (member id); null = unassigned action item. */
    assigneeId: text("assignee_id").references(() => members.id),
    deadline: integer("deadline", { mode: "timestamp_ms" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("checklist_task_idx").on(t.taskId),
    index("checklist_assignee_idx").on(t.assigneeId),
  ],
);

/** Progress reports / task notes (not social chat — CM-007 out of scope). */
export const taskComments = sqliteTable(
  "task_comments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => members.id),
    body: text("body").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("task_comments_task_idx").on(t.taskId, t.createdAt)],
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
    /** Plain summary; rich body lives in bodyMd (post-style editor). */
    status: text("status").notNull().default("draft"), // draft|active|completed|archived
    /** internal = Club Activity; linked = rich post + Shared Event link only */
    kind: text("kind").notNull().default("internal"), // internal|linked
    location: text("location"),
    mode: text("mode").notNull().default("offline"), // offline|online|hybrid
    coverUrl: text("cover_url"),
    bodyMd: text("body_md").notNull().default(""),
    videoUrl: text("video_url"),
    /** JSON string[] image URLs (gallery; cover = first or coverUrl) */
    mediaJson: text("media_json").notNull().default("[]"),
    /** JSON string[] video embed / mp4 URLs */
    videosJson: text("videos_json").notNull().default("[]"),
    capacity: integer("capacity"),
    registerDeadline: integer("register_deadline", { mode: "timestamp_ms" }),
    hostTeamId: text("host_team_id").references(() => teams.id),
    /** JSON: { register?: boolean, btc?: boolean, checkin?: boolean } */
    ctaJson: text("cta_json").notNull().default("{}"),
    externalEventId: text("external_event_id"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => members.id),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
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
    bypass: integer("bypass", { mode: "boolean" }).notNull().default(false),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("audit_club_idx").on(t.clubId),
    index("audit_actor_idx").on(t.actorId),
    index("audit_action_idx").on(t.action),
  ],
);

export const idempotencyKeys = sqliteTable("idempotency_keys", {
  key: text("key").primaryKey(),
  responseJson: text("response_json").notNull(),
  createdAt: ts("created_at"),
});

/** CM-601 in-app notification inbox */
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => members.id),
    clubId: text("club_id").references(() => clubs.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    payloadJson: text("payload_json"),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.createdAt),
    index("notifications_club_idx").on(t.clubId),
  ],
);

/** CM-602 channel preferences (email/push stub until Platform Core) */
export const notificationPreferences = sqliteTable("notification_preferences", {
  memberId: text("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  inApp: integer("in_app", { mode: "boolean" }).notNull().default(true),
  email: integer("email", { mode: "boolean" }).notNull().default(false),
  push: integer("push", { mode: "boolean" }).notNull().default(false),
  updatedAt: ts("updated_at"),
});

/** CM-604 persistent rate-limit windows */
export const rateLimitBuckets = sqliteTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  windowStartMs: integer("window_start_ms").notNull(),
  count: integer("count").notNull().default(0),
});

/** CM-211 — invite link / email invite tokens */
export const clubInviteTokens = sqliteTable(
  "club_invite_tokens",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    kind: text("kind").notNull().default("link"), // link | email
    email: text("email"),
    createdBy: text("created_by")
      .notNull()
      .references(() => members.id),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("club_invite_tokens_club_idx").on(t.clubId),
    index("club_invite_tokens_code_idx").on(t.code),
  ],
);
