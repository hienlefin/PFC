import { describe, expect, it } from "vitest";
import { requireTursoToken, tursoConfigured } from "./env";

describe("ADR-007 Turso env switch", () => {
  it("is off when TURSO_DATABASE_URL is empty (local SQLite path)", () => {
    const prevUrl = process.env.TURSO_DATABASE_URL;
    const prevToken = process.env.TURSO_AUTH_TOKEN;
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    try {
      expect(tursoConfigured()).toBe(false);
    } finally {
      if (prevUrl !== undefined) process.env.TURSO_DATABASE_URL = prevUrl;
      if (prevToken !== undefined) process.env.TURSO_AUTH_TOKEN = prevToken;
    }
  });

  it("requires a token when the Turso URL is set", () => {
    const prevUrl = process.env.TURSO_DATABASE_URL;
    const prevToken = process.env.TURSO_AUTH_TOKEN;
    process.env.TURSO_DATABASE_URL = "libsql://example.turso.io";
    delete process.env.TURSO_AUTH_TOKEN;
    try {
      expect(tursoConfigured()).toBe(true);
      expect(() => requireTursoToken()).toThrow(/TURSO_AUTH_TOKEN/);
    } finally {
      if (prevUrl !== undefined) process.env.TURSO_DATABASE_URL = prevUrl;
      else delete process.env.TURSO_DATABASE_URL;
      if (prevToken !== undefined) process.env.TURSO_AUTH_TOKEN = prevToken;
      else delete process.env.TURSO_AUTH_TOKEN;
    }
  });
});
