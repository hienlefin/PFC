export function logJson(
  level: "info" | "warn" | "error",
  msg: string,
  extra: Record<string, unknown> = {},
): void {
  if (process.env.VITEST === "true" && level === "error") {
    // Expected negative-path API tests would otherwise flood stderr.
    return;
  }
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...extra,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
