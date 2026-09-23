/** CM-602 / ADR-008 — email channel (Resend or SMTP-compatible webhook). */
import { logJson } from "@/platform/logger";
import { clubFlags } from "@/platform/flags";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(msg: EmailMessage): Promise<"sent" | "stub"> {
  if (!clubFlags().notify) return "stub";
  const apiKey = process.env.NOTIFY_EMAIL_API_KEY;
  const from = process.env.NOTIFY_EMAIL_FROM ?? "noreply@pfc.vn";
  const endpoint =
    process.env.NOTIFY_EMAIL_ENDPOINT ?? "https://api.resend.com/emails";

  if (!apiKey) {
    logJson("info", "notify.email.stub", {
      to: msg.to,
      subject: msg.subject,
    });
    return "stub";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html ?? `<p>${msg.text}</p>`,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logJson("error", "notify.email.failed", {
      to: msg.to,
      status: res.status,
      body: body.slice(0, 200),
    });
    throw new Error(`email provider ${res.status}`);
  }
  logJson("info", "notify.email.sent", { to: msg.to, subject: msg.subject });
  return "sent";
}
