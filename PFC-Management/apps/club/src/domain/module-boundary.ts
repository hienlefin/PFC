/**
 * Club module boundary — CM-100 / ADR-006.
 * Trace: FR-CLB-010 (Event = link only), ADR-001/003/004/005.
 * Pure catalog (no Next/DB). Enforcement: tests + ESLint.
 */

export const TRACEABILITY = {
  task: "CM-100",
  adr: "ADR-006",
  fr: ["FR-CLB-010"],
} as const;

export const CLUB_PACKAGE_NAME = "club";

export const CLUB_OWNED_PATHS = [
  "PFC-Management/apps/club/",
  "PFC-Management/docs/adr/",
  "PFC-Management/Club_Management_TodoList.md",
] as const;

/** npm / path fragments other PFC modules and out-of-scope stacks (ADR-004). */
export const FORBIDDEN_IMPORT_SUBSTRINGS = [
  "BeeCount-Cloud",
  "PFC-Opportunity Hub",
  "PFC-Opportunity-Hub",
  "PFC-Opportunity",
  "/Marketplace/",
  "marketplace/",
  "@clerk/",
  "@libsql/",
  "vnpay",
  "shared-event-engine",
  "event-engine/",
] as const;

export const FORBIDDEN_PACKAGE_NAMES = [
  "@clerk/nextjs",
  "@clerk/backend",
  "@libsql/client",
] as const;

/** domain/ must stay FSM/policy-only (modular-srp + CM-100). */
export const DOMAIN_FORBIDDEN_IMPORT_SUBSTRINGS = [
  "next/",
  "next/headers",
  "drizzle-orm",
  "@/db",
  "better-sqlite3",
] as const;

/** Club DB must not own Event/Payment entities (ADR-001, FR-CLB-010). */
export const FORBIDDEN_SCHEMA_TABLE_NAMES = [
  "events",
  "tickets",
  "ticket_orders",
  "payments",
  "checkins",
] as const;

export const ALLOWED_EVENT_LINK_TABLE = "club_event_links";

export function importSpecifierIsForbidden(specifier: string): boolean {
  const trimmed = specifier.trim();
  if ((FORBIDDEN_PACKAGE_NAMES as readonly string[]).includes(trimmed)) {
    return true;
  }
  return FORBIDDEN_IMPORT_SUBSTRINGS.some((frag) => trimmed.includes(frag));
}

export function domainImportIsForbidden(specifier: string): boolean {
  if (specifier === "next" || specifier === "drizzle-orm") return true;
  return DOMAIN_FORBIDDEN_IMPORT_SUBSTRINGS.some((frag) =>
    specifier.includes(frag),
  );
}
