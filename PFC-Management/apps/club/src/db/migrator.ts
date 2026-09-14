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
