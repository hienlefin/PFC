import { eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { rateLimitBuckets } from "@/db/schema";
import {
  RATE_LIMIT_POLICIES,
  type RateLimitAction,
} from "@/domain/rate-limit-policy";
import { AppError } from "@/lib/errors";
import { clubFlags } from "@/platform/flags";

export function assertRateLimit(
  actorId: string,
  action: RateLimitAction,
  now = Date.now(),
): void {
  if (!clubFlags().rateLimit) return;
  const policy = RATE_LIMIT_POLICIES[action];
  const bucketKey = `${actorId}:${action}`;

  sqlite.transaction(() => {
    const row = db
      .select()
      .from(rateLimitBuckets)
      .where(eq(rateLimitBuckets.bucketKey, bucketKey))
      .all()[0];

    if (!row || now - row.windowStartMs >= policy.windowMs) {
      db.insert(rateLimitBuckets)
        .values({
          bucketKey,
          windowStartMs: now,
          count: 1,
        })
        .onConflictDoUpdate({
          target: rateLimitBuckets.bucketKey,
          set: { windowStartMs: now, count: 1 },
        })
        .run();
      return;
    }

    if (row.count >= policy.limit) {
      throw new AppError(
        "RATE_LIMITED",
        `Too many ${action} requests; retry later`,
        429,
      );
    }

    db.update(rateLimitBuckets)
      .set({ count: row.count + 1 })
      .where(eq(rateLimitBuckets.bucketKey, bucketKey))
      .run();
  })();
}

/** Test helper */
export function resetRateLimit(actorId: string, action: RateLimitAction): void {
  const bucketKey = `${actorId}:${action}`;
  db.delete(rateLimitBuckets)
    .where(eq(rateLimitBuckets.bucketKey, bucketKey))
    .run();
}
