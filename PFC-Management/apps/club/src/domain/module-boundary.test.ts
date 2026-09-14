import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_EVENT_LINK_TABLE,
  CLUB_OWNED_PATHS,
  CLUB_PACKAGE_NAME,
  FORBIDDEN_SCHEMA_TABLE_NAMES,
  TRACEABILITY,
  domainImportIsForbidden,
  importSpecifierIsForbidden,
} from "./module-boundary";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(here, "..");
const CLUB_ROOT = path.resolve(here, "../..");

const IMPORT_RE =
  /(?:from|import)\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...walkTsFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function specifiersIn(source: string): string[] {
  const found: string[] = [];
  IMPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(source))) {
    found.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return found.filter(Boolean);
}

function sqliteTableNames(schemaSource: string): string[] {
  const names: string[] = [];
  const re = /sqliteTable\(\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(schemaSource))) names.push(m[1]);
  return names;
}

describe("CM-100 module ownership", () => {
  it("traces CM-100 / ADR-006 / FR-CLB-010", () => {
    expect(TRACEABILITY).toEqual({
      task: "CM-100",
      adr: "ADR-006",
      fr: ["FR-CLB-010"],
    });
  });

  it("declares package name club", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(CLUB_ROOT, "package.json"), "utf8"),
    ) as { name: string };
    expect(pkg.name).toBe(CLUB_PACKAGE_NAME);
  });

  it("documents owned paths used by CODEOWNERS", () => {
    expect(CLUB_OWNED_PATHS).toEqual([
      "PFC-Management/apps/club/",
      "PFC-Management/docs/adr/",
      "PFC-Management/Club_Management_TodoList.md",
    ]);
    const owners = fs.readFileSync(path.join(CLUB_ROOT, "CODEOWNERS"), "utf8");
    expect(owners).toMatch(/@hienlefin/);
    expect(owners).toMatch(/PFC-Management\/docs\/adr/);
    expect(owners).toMatch(/Club_Management_TodoList\.md/);
  });
});

describe("CM-100 forbidden imports", () => {
  const files = walkTsFiles(SRC_ROOT);

  it("scans src for other-module / Clerk / Event-engine imports", () => {
    const violations: string[] = [];
    for (const file of files) {
      const specs = specifiersIn(fs.readFileSync(file, "utf8"));
      for (const spec of specs) {
        if (importSpecifierIsForbidden(spec)) {
          violations.push(`${path.relative(SRC_ROOT, file)} → ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("forbids relative imports that escape apps/club", () => {
    const violations: string[] = [];
    for (const file of files) {
      for (const spec of specifiersIn(fs.readFileSync(file, "utf8"))) {
        if (!spec.startsWith(".")) continue;
        const resolved = path.resolve(path.dirname(file), spec);
        const clubRoot = path.resolve(CLUB_ROOT) + path.sep;
        if (!resolved.startsWith(clubRoot) && resolved !== path.resolve(CLUB_ROOT)) {
          violations.push(`${path.relative(SRC_ROOT, file)} → ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps domain/ free of Next and Drizzle", () => {
    const domainDir = path.join(SRC_ROOT, "domain");
    const violations: string[] = [];
    for (const file of walkTsFiles(domainDir)) {
      if (file.endsWith(".test.ts")) continue;
      for (const spec of specifiersIn(fs.readFileSync(file, "utf8"))) {
        if (domainImportIsForbidden(spec)) {
          violations.push(`${path.relative(SRC_ROOT, file)} → ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("CM-100 schema does not own Event/Payment (FR-CLB-010)", () => {
  const schema = fs.readFileSync(path.join(SRC_ROOT, "db", "schema.ts"), "utf8");
  const tables = sqliteTableNames(schema);

  it("includes club_event_links only as the Event surface", () => {
    expect(tables).toContain(ALLOWED_EVENT_LINK_TABLE);
    expect(schema).toMatch(/externalEventId|external_event_id/);
  });

  it("does not declare Event/ticket/payment tables", () => {
    for (const name of FORBIDDEN_SCHEMA_TABLE_NAMES) {
      expect(tables).not.toContain(name);
    }
  });
});

describe("CM-100 classifier helpers", () => {
  it("flags Opportunity / Clerk / Event-engine specifiers", () => {
    expect(importSpecifierIsForbidden("@clerk/nextjs")).toBe(true);
    expect(
      importSpecifierIsForbidden("../../PFC-Opportunity Hub/src/foo"),
    ).toBe(true);
    expect(importSpecifierIsForbidden("shared-event-engine/tickets")).toBe(
      true,
    );
    expect(importSpecifierIsForbidden("@/server/clubs")).toBe(false);
  });

  it("flags domain Next/DB specifiers", () => {
    expect(domainImportIsForbidden("next/headers")).toBe(true);
    expect(domainImportIsForbidden("@/db/schema")).toBe(true);
    expect(domainImportIsForbidden("./permissions")).toBe(false);
  });
});
