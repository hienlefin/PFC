import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { documents, tasks } from "@/db/schema";
import { RETENTION_MS } from "@/domain/data-class";
import { notifyUser } from "@/platform/notify";
import { t } from "@/i18n/messages";
import { clubFlags } from "@/platform/flags";

/** Background only — never call from Apply/Join request path. */
export function runClubJobs(now = Date.now()) {
  if (!clubFlags().jobs) {
    return { dueTaskReminders: [] as string[], purgedDocuments: 0, ranAt: now };
  }

  const dueTasks = db
    .select({
      id: tasks.id,
      clubId: tasks.clubId,
      title: tasks.title,
      deadline: tasks.deadline,
      status: tasks.status,
      assigneeId: tasks.assigneeId,
    })
    .from(tasks)
    .where(and(lte(tasks.deadline, new Date(now + 24 * 60 * 60 * 1000))))
    .all()
    .filter(
      (task) =>
        task.deadline &&
        task.deadline.getTime() >= now &&
        task.status !== "done" &&
        task.status !== "cancelled",
    );

  for (const task of dueTasks) {
    if (!task.assigneeId) continue;
    notifyUser({
      recipientId: task.assigneeId,
      clubId: task.clubId,
      type: "task.deadline_soon",
      title: t("notify.deadline_soon"),
      body: task.title,
      payload: { taskId: task.id },
    });
  }

  const cutoff = now - RETENTION_MS;
  const expiredDocs = db
    .select()
    .from(documents)
    .where(
      and(
        isNotNull(documents.deletedAt),
        lte(documents.deletedAt, new Date(cutoff)),
      ),
    )
    .all();

  for (const doc of expiredDocs) {
    db.delete(documents).where(eq(documents.id, doc.id)).run();
  }

  return {
    dueTaskReminders: dueTasks.map((task) => task.id),
    purgedDocuments: expiredDocs.length,
    ranAt: now,
  };
}
