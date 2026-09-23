import { describe, expect, it } from "vitest";
import { db, sqlite } from "./index";
import { members, tasks } from "./schema";
import { seedDemo } from "./migrate";
import {
  appliedMigrationVersions,
  migrateDown,
  migrateUp,
} from "./migrator";

function indexNames(): Set<string> {
  const rows = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name IS NOT NULL",
    )
    .all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function tableNames(): Set<string> {
  const rows = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function hasColumn(table: string, column: string): boolean {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return rows.some((r) => r.name === column);
}

describe("CM-101 versioned migrate up/down", () => {
  it("up → seed → down one step preserves rows, no FK orphans, up restores 0003", async () => {
    migrateUp();
    expect(appliedMigrationVersions()).toEqual([
      "0001_init_club",
      "0002_secondary_indexes",
      "0003_audit_sensitive",
      "0004_membership_p4b",
      "0005_g6_cross_cutting",
      "0006_membership_ops",
      "0007_platform_sso",
      "0008_task_pm",
    ]);
    expect(indexNames().has("tasks_deadline_idx")).toBe(true);
    expect(hasColumn("audit_events", "bypass")).toBe(true);
    expect(hasColumn("memberships", "join_reason")).toBe(true);
    expect(hasColumn("tasks", "progress")).toBe(true);
    expect(tableNames().has("club_invite_tokens")).toBe(true);
    expect(tableNames().has("member_platform_ids")).toBe(true);
    expect(tableNames().has("task_comments")).toBe(true);

    await seedDemo();
    const seededMembers = db.select().from(members).all();
    const seededTasks = db.select().from(tasks).all();
    expect(seededMembers.length).toBeGreaterThanOrEqual(2);
    expect(seededTasks.length).toBeGreaterThanOrEqual(1);
    const memberIds = seededMembers.map((m) => m.id);

    const rolled = migrateDown();
    expect(rolled).toBe("0008_task_pm");
    expect(appliedMigrationVersions()).toEqual([
      "0001_init_club",
      "0002_secondary_indexes",
      "0003_audit_sensitive",
      "0004_membership_p4b",
      "0005_g6_cross_cutting",
      "0006_membership_ops",
      "0007_platform_sso",
    ]);
    expect(hasColumn("memberships", "join_reason")).toBe(true);
    expect(tableNames().has("club_invite_tokens")).toBe(true);
    expect(tableNames().has("notifications")).toBe(true);
    expect(tableNames().has("member_platform_ids")).toBe(true);
    expect(tableNames().has("task_comments")).toBe(false);
    expect(hasColumn("audit_events", "bypass")).toBe(true);
    expect(indexNames().has("tasks_deadline_idx")).toBe(true);
    expect(tableNames().has("members")).toBe(true);

    const afterDownMembers = db.select().from(members).all();
    const afterDownTasks = db.select().from(tasks).all();
    expect(afterDownMembers.map((m) => m.id)).toEqual(memberIds);
    expect(afterDownTasks.map((t) => t.id)).toEqual(seededTasks.map((t) => t.id));
    expect(sqlite.pragma("foreign_key_check") as unknown[]).toEqual([]);

    migrateUp();
    expect(appliedMigrationVersions()).toEqual([
      "0001_init_club",
      "0002_secondary_indexes",
      "0003_audit_sensitive",
      "0004_membership_p4b",
      "0005_g6_cross_cutting",
      "0006_membership_ops",
      "0007_platform_sso",
      "0008_task_pm",
    ]);
    expect(hasColumn("audit_events", "bypass")).toBe(true);
    expect(hasColumn("memberships", "join_reason")).toBe(true);
    expect(hasColumn("tasks", "progress")).toBe(true);
    expect(tableNames().has("club_invite_tokens")).toBe(true);
    expect(tableNames().has("member_platform_ids")).toBe(true);
    expect(tableNames().has("task_comments")).toBe(true);
    expect(db.select().from(members).all().map((m) => m.id)).toEqual(memberIds);
    expect(sqlite.pragma("foreign_key_check") as unknown[]).toEqual([]);
  });
});
