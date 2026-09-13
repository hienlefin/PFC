import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/domain/opportunity/status";
import { dueWindows, messageFor, windowLabel } from "@/domain/opportunity/reminders";

/** Job: Verified → Expired when expireAt passed */
export async function runExpireJob(now = new Date()) {
  const due = await prisma.oppOpportunity.findMany({
    where: {
      status: "VERIFIED",
      expireAt: { lte: now },
    },
  });

  let expired = 0;
  for (const opp of due) {
    assertTransition("VERIFIED", "EXPIRED");
    await prisma.oppOpportunity.update({
      where: { id: opp.id },
      data: { status: "EXPIRED" },
    });
    expired += 1;
  }
  return { scanned: due.length, expired };
}

/** Job: create in-app notifications for saved/applied with due reminder windows */
export async function runRemindJob(now = new Date()) {
  const saves = await prisma.oppSavedOpportunity.findMany({
    include: { opportunity: true, member: true },
  });
  const apps = await prisma.oppApplication.findMany({
    where: { status: { in: ["REDIRECTED", "SUBMITTED", "UNDER_REVIEW"] } },
    include: { opportunity: true },
  });

  type Target = { memberId: string; opportunity: (typeof saves)[0]["opportunity"] };
  const map = new Map<string, Target>();
  for (const s of saves) {
    map.set(`${s.memberId}:${s.opportunityId}`, {
      memberId: s.memberId,
      opportunity: s.opportunity,
    });
  }
  for (const a of apps) {
    map.set(`${a.memberId}:${a.opportunityId}`, {
      memberId: a.memberId,
      opportunity: a.opportunity,
    });
  }

  let created = 0;
  let skipped = 0;

  for (const { memberId, opportunity } of map.values()) {
    if (opportunity.status !== "VERIFIED") continue;
    const pref = await prisma.oppReminderPreference.findUnique({ where: { memberId } });
    if (pref && (!pref.enabled || !pref.inApp)) {
      skipped += 1;
      continue;
    }

    const windows = dueWindows(opportunity.deadlineAt, now.getTime());
    for (const window of windows) {
      const existing = await prisma.oppReminderLog.findUnique({
        where: {
          memberId_opportunityId_window: {
            memberId,
            opportunityId: opportunity.id,
            window,
          },
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const deadlineLabel = opportunity.deadlineAt
        ? opportunity.deadlineAt.toLocaleDateString("vi-VN")
        : "sắp tới";
      const body = messageFor(opportunity.title, window, deadlineLabel);
      const deepLink = `/opportunities/${opportunity.id}`;

      await prisma.$transaction([
        prisma.oppReminderLog.create({
          data: { memberId, opportunityId: opportunity.id, window },
        }),
        prisma.oppNotification.create({
          data: {
            memberId,
            opportunityId: opportunity.id,
            title: windowLabel(window),
            body,
            deepLink,
          },
        }),
      ]);
      created += 1;
    }
  }

  return { created, skipped, targets: map.size };
}
