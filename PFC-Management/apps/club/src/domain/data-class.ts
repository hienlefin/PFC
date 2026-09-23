/** ADR-003 / P1.8 — classification + retention for Club data. */

export const DATA_CLASSIFICATION = {
  membershipPii: "confidential",
  internalDocument: "confidential",
} as const;

/** Default 24 months after leave / disband / doc soft-delete unless Legal overrides. */
export const RETENTION_MONTHS = 24;
export const RETENTION_MS = RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000;

export function isRetentionElapsed(
  endedAtMs: number,
  nowMs = Date.now(),
  retentionMs = RETENTION_MS,
): boolean {
  return nowMs - endedAtMs >= retentionMs;
}
