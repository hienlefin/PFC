import { logJson } from "@/platform/logger";

type CounterMap = Record<string, number>;

const counters: CounterMap = {
  "club.joins": 0,
  "club.tasks_done": 0,
  "club.http_403": 0,
  "club.http_429": 0,
  "club.notify_sent": 0,
};

const ALERT_THRESHOLDS = {
  "club.http_403": 50,
} as const;

export function incMetric(name: keyof typeof counters | string, by = 1): void {
  counters[name] = (counters[name] ?? 0) + by;
  const threshold = (ALERT_THRESHOLDS as Record<string, number>)[name];
  if (threshold !== undefined && counters[name] >= threshold) {
    logJson("warn", "metrics.alert", {
      metric: name,
      value: counters[name],
      threshold,
    });
  }
}

export function snapshotMetrics(): CounterMap & { capturedAt: number } {
  return { ...counters, capturedAt: Date.now() };
}

export function resetMetricsForTests(): void {
  for (const key of Object.keys(counters)) counters[key] = 0;
}
