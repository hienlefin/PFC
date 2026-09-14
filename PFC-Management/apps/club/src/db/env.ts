/**
 * Env switch: file SQLite (dev) vs Turso libSQL (production).
 * Trace: ADR-007. Do not import this from domain/.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";

const clubRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
if (!process.env.VITEST) {
  loadEnvConfig(clubRoot, process.env.NODE_ENV !== "production");
}

export function tursoConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}

export function requireTursoToken(): string {
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set",
    );
  }
  return token;
}
