import { nanoid } from "nanoid";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  members,
  notificationPreferences,
  notifications,
} from "@/db/schema";
import type { NotifyType } from "@/domain/notify-events";
import { clubFlags } from "@/platform/flags";
import { logJson } from "@/platform/logger";
import { incMetric } from "@/platform/metrics";
import { sendEmail } from "@/platform/channels/email";
import { sendPush } from "@/platform/channels/push";

export type NotifyInput = {
  recipientId: string;
  clubId?: string | null;
  type: NotifyType;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
};

function prefsFor(memberId: string) {
  const row = db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.memberId, memberId))
    .all()[0];
  return (
    row ?? {
      memberId,
      inApp: true,
      email: false,
      push: false,
    }
  );
}

/** Best-effort: never throws into the caller use-case. */
export function notifyUser(input: NotifyInput): { id: string } | null {
  try {
    if (!clubFlags().notify) return null;
    const prefs = prefsFor(input.recipientId);
    if (!prefs.inApp && !prefs.email && !prefs.push) return null;

    let id: string | null = null;
    if (prefs.inApp) {
      id = nanoid();
      db.insert(notifications)
        .values({
          id,
          recipientId: input.recipientId,
          clubId: input.clubId ?? null,
          type: input.type,
          title: input.title,
          body: input.body ?? "",
          payloadJson: input.payload ? JSON.stringify(input.payload) : null,
        })
        .run();
    }

    const member = db
      .select()
      .from(members)
      .where(eq(members.id, input.recipientId))
      .all()[0];

    // ADR-008: real providers when env set; otherwise stub log inside channel
    if (prefs.email && member?.email) {
      void sendEmail({
        to: member.email,
        subject: input.title,
        text: input.body || input.title,
      }).catch((err) =>
        logJson("error", "notify.email.async_failed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
    if (prefs.push) {
      void sendPush({
        recipientId: input.recipientId,
        title: input.title,
        body: input.body || input.title,
        data: input.payload,
      }).catch((err) =>
        logJson("error", "notify.push.async_failed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    if (id) incMetric("club.notify_sent");
    return id ? { id } : null;
  } catch (err) {
    logJson("error", "notify.failed", {
      recipientId: input.recipientId,
      type: input.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export function listNotifications(
  recipientId: string,
  opts?: { unreadOnly?: boolean },
) {
  const rows = db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, recipientId))
    .orderBy(desc(notifications.createdAt))
    .all();
  return opts?.unreadOnly ? rows.filter((r) => !r.readAt) : rows;
}

export function markNotificationRead(
  recipientId: string,
  notificationId: string,
) {
  const row = db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientId, recipientId),
      ),
    )
    .all()[0];
  if (!row) return false;
  if (!row.readAt) {
    db.update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .run();
  }
  return true;
}

export function markAllNotificationsRead(recipientId: string) {
  db.update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
      ),
    )
    .run();
}

export function getNotificationPreferences(memberId: string) {
  return prefsFor(memberId);
}

export function upsertNotificationPreferences(
  memberId: string,
  patch: { inApp?: boolean; email?: boolean; push?: boolean },
) {
  const existing = db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.memberId, memberId))
    .all()[0];
  const next = {
    inApp: patch.inApp ?? existing?.inApp ?? true,
    email: patch.email ?? existing?.email ?? false,
    push: patch.push ?? existing?.push ?? false,
    updatedAt: new Date(),
  };
  if (existing) {
    db.update(notificationPreferences)
      .set(next)
      .where(eq(notificationPreferences.memberId, memberId))
      .run();
  } else {
    db.insert(notificationPreferences)
      .values({ memberId, ...next })
      .run();
  }
  return getNotificationPreferences(memberId);
}
