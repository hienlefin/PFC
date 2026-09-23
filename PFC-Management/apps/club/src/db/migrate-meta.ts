/**
 * Test-only / legacy helpers.
 * Production migrate uses drizzle via migrator.ts (version journal).
 * Lifecycle tests call migrateDown() to wipe the SQLite file tables.
 */
import { sqlite } from "./index";
import { REQUIRED_INDEXES } from "@/domain/capacity";

const DOWN_SQL = `
PRAGMA foreign_keys = OFF;
DROP TRIGGER IF EXISTS membership_history_no_update;
DROP TRIGGER IF EXISTS membership_history_no_delete;
DROP TABLE IF EXISTS rate_limit_buckets;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS club_invite_tokens;
DROP TABLE IF EXISTS member_platform_ids;
DROP TABLE IF EXISTS idempotency_keys;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS club_event_links;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS activity_participants;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS task_comments;
DROP TABLE IF EXISTS task_checklist_items;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS membership_history;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS schema_migrations;
PRAGMA foreign_keys = ON;
`;

/** Nuclear wipe for Vitest — not a production migrate-down. */
export function migrateDown(): void {
  sqlite.exec(DOWN_SQL);
}

export function dbPing(): boolean {
  try {
    sqlite.prepare("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}

export function listAppliedMigrations(): string[] {
  try {
    const cols = sqlite.prepare(`PRAGMA table_info(schema_migrations)`).all() as {
      name: string;
    }[];
    const names = new Set(cols.map((c) => c.name));
    if (names.has("version")) {
      return sqlite
        .prepare("SELECT version FROM schema_migrations ORDER BY version")
        .all()
        .map((r) => (r as { version: string }).version);
    }
    if (names.has("id")) {
      return sqlite
        .prepare("SELECT id FROM schema_migrations ORDER BY id")
        .all()
        .map((r) => (r as { id: string }).id);
    }
    return [];
  } catch {
    return [];
  }
}

export function assertRequiredIndexesPresent(): string[] {
  const rows = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'index'`)
    .all() as { name: string }[];
  const have = new Set(rows.map((r) => r.name));
  return REQUIRED_INDEXES.filter((name) => !have.has(name));
}
