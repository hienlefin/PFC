import { createClient, type Client } from "@libsql/client";
import { requireTursoToken, tursoConfigured } from "./env";

/** HTTP libSQL client (Vercel/serverless). Only constructed when Turso env is set. */
export function createTursoClient(): Client {
  if (!tursoConfigured()) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  return createClient({
    url: process.env.TURSO_DATABASE_URL!.trim(),
    authToken: requireTursoToken(),
  });
}
