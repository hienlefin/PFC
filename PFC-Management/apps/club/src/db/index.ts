import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { requireTursoToken, tursoConfigured } from "./env";
import { asClubSqlite, type ClubSqlite } from "./sqlite-adapter";

const require = createRequire(import.meta.url);

function openLocalFile(): Database.Database {
  const dataDir = process.env.VERCEL
    ? path.join("/tmp", "pfc-club-data")
    : path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = process.env.CLUB_DB_PATH ?? path.join(dataDir, "club.sqlite");
  const local = new Database(dbPath);
  local.pragma("journal_mode = WAL");
  local.pragma("foreign_keys = ON");
  return local;
}

/** Native libSQL handle (same shape as better-sqlite3). HTTP client: `./turso-client`. */
function openTursoNative(): Database.Database {
  const libsqlMod = require("libsql") as {
    default?: new (
      url: string,
      opts?: { authToken: string },
    ) => Database.Database;
  } & (new (url: string, opts?: { authToken: string }) => Database.Database);
  const Libsql = libsqlMod.default ?? libsqlMod;
  const native = new Libsql(process.env.TURSO_DATABASE_URL!.trim(), {
    authToken: requireTursoToken(),
  });
  try {
    native.pragma("foreign_keys = ON");
  } catch {
    /* some remote PRAGMAs are no-ops */
  }
  return native;
}

const raw: Database.Database = tursoConfigured()
  ? openTursoNative()
  : openLocalFile();

export const db = drizzle(raw, { schema });
export const sqlite: ClubSqlite = asClubSqlite(raw);
export { schema };
export { tursoConfigured } from "./env";
export { createTursoClient } from "./turso-client";
