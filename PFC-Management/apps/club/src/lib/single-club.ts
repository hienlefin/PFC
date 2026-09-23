import { AppError } from "@/lib/errors";

/** Single-club product config (not multi-tenant SaaS). */
export const SINGLE_CLUB = {
  slug: "pfc-investors",
  name: "PFC — Personal Finance Club",
  shortName: "PFC",
} as const;

/** ADR-005 — club cannot be dissolved / lifecycle-mutated in product. */
export const CLUB_TRANSITION_REJECTION = {
  code: "NOT_SUPPORTED",
  status: 400,
  message:
    "Không hỗ trợ giải tán / chuyển trạng thái giải tán câu lạc bộ",
} as const;

export function rejectClubTransition(): never {
  throw new AppError(
    CLUB_TRANSITION_REJECTION.code,
    CLUB_TRANSITION_REJECTION.message,
    CLUB_TRANSITION_REJECTION.status,
  );
}
