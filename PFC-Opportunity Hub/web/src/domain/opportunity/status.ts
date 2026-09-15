// Domain FSM — pure, no Next/DB imports
// Opportunity.status: Draft -> Pending -> Verified|Rejected -> Expired

export type OpportunityStatus =
  | "DRAFT"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

const ALLOWED: Record<OpportunityStatus, OpportunityStatus[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["VERIFIED", "REJECTED"],
  VERIFIED: ["EXPIRED", "REJECTED"],
  REJECTED: [],
  EXPIRED: [],
};

export function canTransition(
  from: OpportunityStatus,
  to: OpportunityStatus,
): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: OpportunityStatus,
  to: OpportunityStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid opportunity transition ${from} -> ${to}`);
  }
}

/** Public catalog may only show these */
export function isPubliclyVisible(
  status: OpportunityStatus,
  expireAt?: Date | null,
  now = new Date(),
): boolean {
  if (status !== "VERIFIED") return false;
  if (expireAt && expireAt.getTime() <= now.getTime()) return false;
  return true;
}

export function assertHttpsUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid external URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("External apply URL must be https");
  }
}
