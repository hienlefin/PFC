import { prisma } from "@/lib/prisma";
import { MAX_DELIVERY_ATTEMPTS, nextRetryAt, type NotifyChannel } from "@/domain/notification/channels";

type SendResult = { ok: true } | { ok: false; configured: boolean; error: string };

async function sendEmail(to: string, title: string, body: string): Promise<SendResult> {
  const host = process.env.SMTP_HOST;
  if (!host) return { ok: false, configured: false, error: "SMTP not configured" };
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || "noreply@pfc.vn",
    to,
    subject: title,
    text: body,
  });
  return { ok: true };
}

async function sendPush(memberId: string, title: string, body: string, deepLink: string | null): Promise<SendResult> {
  const url = process.env.PUSH_WEBHOOK_URL;
  if (!url) return { ok: false, configured: false, error: "Push webhook not configured" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, title, body, deepLink }),
  });
  if (!res.ok) return { ok: false, configured: true, error: `Push webhook ${res.status}` };
  return { ok: true };
}

async function deliverInApp(row: {
  id: string;
  memberId: string;
  opportunityId: string | null;
  title: string;
  body: string;
  deepLink: string | null;
}): Promise<SendResult> {
  await prisma.oppNotification.upsert({
    where: { deliveryId: row.id },
    update: {},
    create: {
      memberId: row.memberId,
      opportunityId: row.opportunityId,
      title: row.title,
      body: row.body,
      deepLink: row.deepLink,
      deliveryId: row.id,
    },
  });
  return { ok: true };
}

export async function runDispatchJob(now = new Date()) {
  const due = await prisma.oppDelivery.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    take: 50,
    orderBy: { nextAttemptAt: "asc" },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of due) {
    const member = await prisma.member.findUnique({ where: { id: row.memberId } });
    let result: SendResult;
    try {
      if (row.channel === "IN_APP") result = await deliverInApp(row);
      else if (row.channel === "EMAIL") {
        if (!member) result = { ok: false, configured: true, error: "Member missing" };
        else result = await sendEmail(member.email, row.title, row.body);
      } else if (row.channel === "PUSH") {
        result = await sendPush(row.memberId, row.title, row.body, row.deepLink);
      } else {
        result = { ok: false, configured: false, error: "Unknown channel" };
      }
    } catch (err) {
      result = { ok: false, configured: true, error: err instanceof Error ? err.message : "send failed" };
    }

    if (result.ok) {
      await prisma.oppDelivery.update({
        where: { id: row.id },
        data: { status: "SENT", lastError: null },
      });
      sent += 1;
      continue;
    }

    if (!result.configured) {
      await prisma.oppDelivery.update({
        where: { id: row.id },
        data: { status: "SKIPPED", lastError: result.error },
      });
      skipped += 1;
      continue;
    }

    const attempts = row.attempts + 1;
    const giveUp = attempts >= MAX_DELIVERY_ATTEMPTS;
    await prisma.oppDelivery.update({
      where: { id: row.id },
      data: {
        attempts,
        lastError: result.error,
        status: giveUp ? "FAILED" : "PENDING",
        nextAttemptAt: giveUp ? row.nextAttemptAt : nextRetryAt(attempts, now.getTime()),
      },
    });
    if (giveUp) {
      console.error(`[alert] delivery ${row.id} ${row.channel} failed: ${result.error}`);
      failed += 1;
    }
  }

  return { scanned: due.length, sent, skipped, failed };
}

export function isNotifyChannel(value: string): value is NotifyChannel {
  return value === "IN_APP" || value === "EMAIL" || value === "PUSH";
}
