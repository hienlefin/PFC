export const CLUB_VISIBILITIES = ["open", "private"] as const;
export type ClubVisibility = (typeof CLUB_VISIBILITIES)[number];

export const CLUB_STATUSES = [
  "draft",
  "active",
  "archived",
  "disbanded",
] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];

const CLUB_TRANSITIONS: Record<ClubStatus, ClubStatus[]> = {
  draft: ["active", "disbanded"],
  active: ["archived", "disbanded"],
  archived: ["active", "disbanded"],
  disbanded: [],
};

export function canTransitionClub(from: ClubStatus, to: ClubStatus): boolean {
  return CLUB_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canViewClubContent(opts: {
  visibility: ClubVisibility;
  isMember: boolean;
  isAuthenticated: boolean;
}): boolean {
  if (!opts.isAuthenticated) return false;
  if (opts.visibility === "open") return true;
  return opts.isMember;
}
