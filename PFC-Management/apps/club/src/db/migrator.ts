import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "./index";

const DRIZZLE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

const UP_FILE = /^(\d{4}_[a-z0-9_]+)\.sql$/i;

export type MigrationFile = {
  version: string;
  upPath: string;
  downPath: string;
};

export function listMigrationFiles(): MigrationFile[] {
  const names = fs.readdirSync(DRIZZLE_DIR).filter((n) => UP_FILE.test(n));
  names.sort();
  return names.map((name) => {
    const version = name.replace(/\.sql$/i, "");
    return {
      version,
      upPath: path.join(DRIZZLE_DIR, name),
      downPath: path.join(DRIZZLE_DIR, `${version}.down.sql`),
    };
  });
}

function ensureJournal(): void {
  const cols = sqlite
    .prepare(`PRAGMA table_info(schema_migrations)`)
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  // Legacy untracked migrate-meta used `id` PK — rebuild to version journal.
  if (cols.length > 0 && names.has("id") && !names.has("version")) {
    sqlite.exec(`DROP TABLE IF EXISTS schema_migrations`);
  }
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);
}

function appliedVersions(): string[] {
  ensureJournal();
  const rows = sqlite
    .prepare("SELECT version FROM schema_migrations ORDER BY version")
    .all() as { version: string }[];
  return rows.map((r) => r.version);
}

function tableExists(name: string): boolean {
  const row = sqlite
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(name) as { ok: number } | undefined;
  return !!row;
}

/** DBs created by the old inline migrateUp() have 0001+0002 objects but no journal. */
const LEGACY_STAMP_VERSIONS = ["0001_init_club", "0002_secondary_indexes"];

function stampLegacyIfNeeded(files: MigrationFile[]): void {
  const applied = appliedVersions();
  if (applied.length > 0) return;
  if (!tableExists("members")) return;
  const now = Date.now();
  const insert = sqlite.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
  );
  const stamp = new Set(LEGACY_STAMP_VERSIONS);
  const tx = sqlite.transaction(() => {
    for (const f of files) {
      if (stamp.has(f.version)) insert.run(f.version, now);
    }
  });
  tx();
}

function ensureTaskProgressColumn(): void {
  if (!tableExists("tasks")) return;
  const cols = sqlite
    .prepare(`PRAGMA table_info(tasks)`)
    .all() as { name: string }[];
  if (cols.some((c) => c.name === "progress")) return;
  sqlite.exec(
    `ALTER TABLE tasks ADD COLUMN progress INTEGER NOT NULL DEFAULT 0`,
  );
}

/** Case-insensitive team names — columns, dedupe, unique index (idempotent). */
function ensureTeamNameUnique(): void {
  if (!tableExists("teams")) return;
  const cols = sqlite
    .prepare(`PRAGMA table_info(teams)`)
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("name_normalized")) {
    sqlite.exec(`ALTER TABLE teams ADD COLUMN name_normalized TEXT`);
  }
  if (!names.has("updated_at")) {
    sqlite.exec(`ALTER TABLE teams ADD COLUMN updated_at INTEGER`);
    sqlite.exec(
      `UPDATE teams SET updated_at = unixepoch() * 1000 WHERE updated_at IS NULL`,
    );
  }
  sqlite.exec(`
    UPDATE teams
    SET name_normalized = lower(trim(name))
    WHERE name_normalized IS NULL OR name_normalized = '';
  `);
  sqlite.exec(`
    UPDATE memberships
    SET team_id = (
      SELECT t2.id FROM teams t2
      WHERE t2.club_id = (SELECT club_id FROM teams WHERE id = memberships.team_id)
        AND t2.name_normalized = (SELECT name_normalized FROM teams WHERE id = memberships.team_id)
      ORDER BY t2.created_at ASC, t2.id ASC
      LIMIT 1
    )
    WHERE team_id IS NOT NULL;
  `);
  sqlite.exec(`
    UPDATE tasks
    SET team_id = (
      SELECT t2.id FROM teams t2
      WHERE t2.club_id = (SELECT club_id FROM teams WHERE id = tasks.team_id)
        AND t2.name_normalized = (SELECT name_normalized FROM teams WHERE id = tasks.team_id)
      ORDER BY t2.created_at ASC, t2.id ASC
      LIMIT 1
    )
    WHERE team_id IS NOT NULL;
  `);
  sqlite.exec(`
    DELETE FROM teams
    WHERE id IN (
      SELECT t.id FROM teams t
      WHERE EXISTS (
        SELECT 1 FROM teams older
        WHERE older.club_id = t.club_id
          AND older.name_normalized = t.name_normalized
          AND (
            older.created_at < t.created_at
            OR (older.created_at = t.created_at AND older.id < t.id)
          )
      )
    );
  `);
  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS teams_club_name_norm_uidx
      ON teams(club_id, name_normalized);
  `);
}

export function migrateUp(): void {
  const files = listMigrationFiles();
  ensureJournal();
  stampLegacyIfNeeded(files);
  const applied = new Set(appliedVersions());
  const insert = sqlite.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
  );
  for (const file of files) {
    if (applied.has(file.version)) continue;
    const sql = fs.readFileSync(file.upPath, "utf8");
    sqlite.exec(sql);
    insert.run(file.version, Date.now());
  }
  ensureTaskProgressColumn();
  ensureTeamNameUnique();
  ensureActivityRichColumns();
  ensureTaskHierarchyColumns();
}

/** Sub-task assignee/deadline + parent activity link (idempotent ALTER). */
function ensureTaskHierarchyColumns(): void {
  if (tableExists("tasks")) {
    const cols = sqlite
      .prepare(`PRAGMA table_info(tasks)`)
      .all() as { name: string }[];
    const names = new Set(cols.map((c) => c.name));
    if (!names.has("activity_id")) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN activity_id TEXT`);
    }
    sqlite.exec(
      `CREATE INDEX IF NOT EXISTS tasks_team_idx ON tasks(team_id)`,
    );
  }
  if (tableExists("task_checklist_items")) {
    const cols = sqlite
      .prepare(`PRAGMA table_info(task_checklist_items)`)
      .all() as { name: string }[];
    const names = new Set(cols.map((c) => c.name));
    if (!names.has("assignee_id")) {
      sqlite.exec(
        `ALTER TABLE task_checklist_items ADD COLUMN assignee_id TEXT`,
      );
    }
    if (!names.has("deadline")) {
      sqlite.exec(
        `ALTER TABLE task_checklist_items ADD COLUMN deadline INTEGER`,
      );
    }
    sqlite.exec(
      `CREATE INDEX IF NOT EXISTS checklist_assignee_idx ON task_checklist_items(assignee_id)`,
    );
  }
}

/** Rich event-post fields on activities (idempotent ALTER). */
function ensureActivityRichColumns(): void {
  if (!tableExists("activities")) return;
  const cols = sqlite
    .prepare(`PRAGMA table_info(activities)`)
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  const add = (col: string, ddl: string) => {
    if (!names.has(col)) sqlite.exec(`ALTER TABLE activities ADD COLUMN ${ddl}`);
  };
  add("kind", `kind TEXT NOT NULL DEFAULT 'internal'`);
  add("location", `location TEXT`);
  add("mode", `mode TEXT NOT NULL DEFAULT 'offline'`);
  add("cover_url", `cover_url TEXT`);
  add("body_md", `body_md TEXT NOT NULL DEFAULT ''`);
  add("video_url", `video_url TEXT`);
  add("cta_json", `cta_json TEXT NOT NULL DEFAULT '{}'`);
  add("external_event_id", `external_event_id TEXT`);
  add("updated_at", `updated_at INTEGER`);
  add("media_json", `media_json TEXT NOT NULL DEFAULT '[]'`);
  add("videos_json", `videos_json TEXT NOT NULL DEFAULT '[]'`);
  add("capacity", `capacity INTEGER`);
  add("register_deadline", `register_deadline INTEGER`);
  add("host_team_id", `host_team_id TEXT`);
  sqlite.exec(`
    UPDATE activities
    SET body_md = description
    WHERE (body_md IS NULL OR body_md = '')
      AND description IS NOT NULL
      AND description != '';
  `);
  const rows = sqlite
    .prepare(
      `SELECT id, cover_url, video_url, media_json, videos_json FROM activities`,
    )
    .all() as {
    id: string;
    cover_url: string | null;
    video_url: string | null;
    media_json: string | null;
    videos_json: string | null;
  }[];
  const upd = sqlite.prepare(
    `UPDATE activities SET media_json = ?, videos_json = ? WHERE id = ?`,
  );
  for (const r of rows) {
    let media: string[] = [];
    let videos: string[] = [];
    try {
      media = JSON.parse(r.media_json || "[]");
      if (!Array.isArray(media)) media = [];
    } catch {
      media = [];
    }
    try {
      videos = JSON.parse(r.videos_json || "[]");
      if (!Array.isArray(videos)) videos = [];
    } catch {
      videos = [];
    }
    if (!media.length && r.cover_url) media = [r.cover_url];
    if (!videos.length && r.video_url) videos = [r.video_url];
    upd.run(JSON.stringify(media), JSON.stringify(videos), r.id);
  }
}

/**
 * Roll back the latest applied migration (one step).
 * Does not delete the SQLite file.
 */
export function migrateDown(): string {
  const files = listMigrationFiles();
  ensureJournal();
  stampLegacyIfNeeded(files);
  const applied = appliedVersions();
  const latest = applied[applied.length - 1];
  if (!latest) {
    throw new Error("No applied migrations to roll back");
  }
  const file = files.find((f) => f.version === latest);
  if (!file) {
    throw new Error(`Missing migration files for ${latest}`);
  }
  if (!fs.existsSync(file.downPath)) {
    throw new Error(`Missing down script: ${file.downPath}`);
  }
  const sql = fs.readFileSync(file.downPath, "utf8");
  sqlite.exec(sql);
  sqlite.prepare("DELETE FROM schema_migrations WHERE version = ?").run(latest);
  return latest;
}

export function appliedMigrationVersions(): string[] {
  return appliedVersions();
}
