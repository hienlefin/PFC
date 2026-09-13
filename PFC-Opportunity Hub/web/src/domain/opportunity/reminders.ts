/**
 * Adapted from opportunity-radar/src/lib/nudges.ts
 * PFC launch windows: T-7 / T-3 / T-1 / T0 (no T-14 / T-3h)
 */

const DAY = 86_400_000;

export type ReminderWindow = "T-7" | "T-3" | "T-1" | "T0";

export const REMINDER_WINDOWS: Array<{ window: ReminderWindow; offsetMs: number }> = [
  { window: "T-7", offsetMs: 7 * DAY },
  { window: "T-3", offsetMs: 3 * DAY },
  { window: "T-1", offsetMs: 1 * DAY },
  { window: "T0", offsetMs: 0 },
];

export function windowLabel(w: ReminderWindow): string {
  const map: Record<ReminderWindow, string> = {
    "T-7": "Còn 7 ngày",
    "T-3": "Còn 3 ngày",
    "T-1": "Còn 1 ngày",
    T0: "Hết hạn hôm nay",
  };
  return map[w];
}

export function messageFor(title: string, w: ReminderWindow, deadlineLabel: string): string {
  switch (w) {
    case "T-7":
      return `Còn 1 tuần — "${title}" đóng ${deadlineLabel}. Dành 20 phút bắt đầu hồ sơ.`;
    case "T-3":
      return `Chỉ còn 3 ngày — "${title}" đóng ${deadlineLabel}. Đừng bỏ lỡ.`;
    case "T-1":
      return `Đóng hạn ngày mai: "${title}". Hạn cuối ${deadlineLabel}.`;
    case "T0":
      return `Hôm nay hết hạn — "${title}". Nộp ngay nếu còn kịp.`;
  }
}

/** Window is "due" if fireAt is in [now - 12h, now] to allow hourly/daily job lag */
export function isWindowDue(deadlineMs: number, offsetMs: number, now: number): boolean {
  const fireAt = deadlineMs - offsetMs;
  const lag = 12 * 60 * 60 * 1000;
  return fireAt <= now && fireAt >= now - lag;
}

export function dueWindows(
  deadline: Date | null | undefined,
  now = Date.now(),
): ReminderWindow[] {
  if (!deadline) return [];
  const deadlineMs = deadline.getTime();
  if (Number.isNaN(deadlineMs)) return [];
  return REMINDER_WINDOWS.filter((w) => isWindowDue(deadlineMs, w.offsetMs, now)).map(
    (w) => w.window,
  );
}
