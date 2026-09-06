/** Membership lifecycle — ADR-002 / FR-CLB-003 */
export const MEMBERSHIP_STATUSES = [
  "pending",
  "active",
  "rejected",
  "inactive",
  "left",
  "alumni",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

const TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  pending: ["active", "rejected"],
  active: ["inactive", "left", "alumni"],
  inactive: ["active", "left"],
  rejected: [],
  left: ["active"], // rejoin path (admin)
  alumni: ["active"],
};

export function canTransitionMembership(
  from: MembershipStatus,
  to: MembershipStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertMembershipTransition(
  from: MembershipStatus,
  to: MembershipStatus,
): void {
  if (!canTransitionMembership(from, to)) {
    throw new Error(`Illegal membership transition: ${from} → ${to}`);
  }
}
