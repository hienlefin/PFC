export type NotifyChannel = "IN_APP" | "EMAIL" | "PUSH";

export type ReminderPref = {
  enabled: boolean;
  inApp: boolean;
  email: boolean;
  push: boolean;
};

const ALL_ON: ReminderPref = { enabled: true, inApp: true, email: true, push: true };

export function channelsFor(pref: ReminderPref | null | undefined): NotifyChannel[] {
  const p = pref ?? ALL_ON;
  if (!p.enabled) return [];
  const out: NotifyChannel[] = [];
  if (p.inApp) out.push("IN_APP");
  if (p.email) out.push("EMAIL");
  if (p.push) out.push("PUSH");
  return out;
}

export const MAX_DELIVERY_ATTEMPTS = 5;

export function nextRetryAt(attempts: number, now = Date.now()): Date {
  const minutes = Math.min(60, 2 ** Math.max(1, attempts));
  return new Date(now + minutes * 60_000);
}
