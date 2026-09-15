export type ListingStatus =
  | "DRAFT"
  | "PENDING"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED";

const ALLOWED: Record<ListingStatus, ListingStatus[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["UNPUBLISHED"],
  UNPUBLISHED: ["PUBLISHED", "ARCHIVED", "PENDING"],
  ARCHIVED: [],
};

export function canTransitionListing(from: ListingStatus, to: ListingStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertListingTransition(from: ListingStatus, to: ListingStatus): void {
  if (!canTransitionListing(from, to)) {
    throw new Error(`Invalid listing transition ${from} -> ${to}`);
  }
}
