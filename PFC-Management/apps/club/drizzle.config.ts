import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit generate emits UP SQL only (no down).
 * Pair each generated file with a hand-written `*.down.sql` (CM-101).
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.CLUB_DB_PATH ?? "./.data/club.sqlite",
  },
});
