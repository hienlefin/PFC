import { nanoid } from "nanoid";
import { db } from "@/db";
import { auditEvents, idempotencyKeys } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export type AuditResult = "allow" | "deny";

export type SensitiveAuditInput = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  clubId?: string | null;
  result: AuditResult;
  bypass?: boolean;
  metadata?: Record<string, unknown>;
  correlationId?: string;
};

/**
 * CM-106 — fail-closed insert. No try/catch swallow.
 * Append-only: there is no update/delete helper for this table.
 */
export function writeSensitiveAudit(input: SensitiveAuditInput): void {
  const bypass = input.bypass ?? false;
  const metadata = { ...input.metadata, bypass };
  db.insert(auditEvents)
    .values({
      id: nanoid(),
      clubId: input.clubId ?? null,
      actorId: input.actorId,
      action: input.action,
      objectType: input.resourceType,
      objectId: input.resourceId ?? null,
      result: input.result,
      bypass,
      metaJson: JSON.stringify(metadata),
      correlationId: input.correlationId ?? null,
    })
    .run();
}

export function writeAudit(input: {
  clubId?: string | null;
  actorId?: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  result?: string;
  meta?: unknown;
  correlationId?: string;
  bypass?: boolean;
}): void {
  const bypass = input.bypass ?? false;
  db.insert(auditEvents)
    .values({
      id: nanoid(),
      clubId: input.clubId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId ?? null,
      result: input.result ?? "ok",
      bypass,
      metaJson: input.meta ? JSON.stringify(input.meta) : null,
      correlationId: input.correlationId ?? null,
    })
    .run();
}

export function listAuditByAction(action: string) {
  return db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.action, action))
    .orderBy(desc(auditEvents.createdAt))
    .all();
}

export function withIdempotency<T>(
  key: string | null | undefined,
  compute: () => T,
): T {
  if (!key) return compute();
  const hit = db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .all()[0];
  if (hit) return JSON.parse(hit.responseJson) as T;
  const result = compute();
  db.insert(idempotencyKeys)
    .values({ key, responseJson: JSON.stringify(result) })
    .run();
  return result;
}
