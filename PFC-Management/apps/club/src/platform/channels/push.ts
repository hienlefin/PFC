/** CM-602 / ADR-008 — push via Platform webhook (FCM/APNs owned by Core). */
import { logJson } from "@/platform/logger";
import { clubFlags } from "@/platform/flags";

export type PushMessage = {
  recipientId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function sendPush(msg: PushMessage): Promise<"sent" | "stub"> {
  if (!clubFlags().notify) return "stub";
  const url = process.env.NOTIFY_PUSH_WEBHOOK_URL;
  if (!url) {
    logJson("info", "notify.push.stub", {
      recipientId: msg.recipientId,
      title: msg.title,
    });
    return "stub";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.NOTIFY_PUSH_WEBHOOK_TOKEN
        ? { authorization: `Bearer ${process.env.NOTIFY_PUSH_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(msg),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    logJson("error", "notify.push.failed", {
      recipientId: msg.recipientId,
      status: res.status,
    });
    throw new Error(`push provider ${res.status}`);
  }
  logJson("info", "notify.push.sent", { recipientId: msg.recipientId });
  return "sent";
}
