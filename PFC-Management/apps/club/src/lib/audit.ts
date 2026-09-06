import { nanoid } from "nanoid";
import { db } from "@/db";
import { auditEvents, idempotencyKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

export function writeAudit(input: {
  clubId?: string | null;
  actorId?: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  result?: string;
  meta?: unknown;
  correlationId?: string;
}): void {
  db.insert(auditEvents)
    .values({
      id: nanoid(),
      clubId: input.clubId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId ?? null,
      result: input.result ?? "ok",
      metaJson: input.meta ? JSON.stringify(input.meta) : null,
      correlationId: input.correlationId ?? null,
    })
    .run();
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
