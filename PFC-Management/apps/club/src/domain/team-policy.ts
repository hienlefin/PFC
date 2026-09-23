/**
 * Team / Ban policy — case-insensitive uniqueness + position↔ban sync (ADR-003).
 * Spec roles map: CHUNHIEM→owner · BAN_DIEU_HANH→leader · TRUONG_BAN→ban_* · THANH_VIEN→member
 */
import type { Position } from "./permissions";

export function normalizeTeamName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export function sanitizeTeamName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Canonical ban names for ban_* / leader positions (display form). */
export const POSITION_DEFAULT_TEAM: Partial<Record<Position, string>> = {
  leader: "Ban Điều hành",
  ban_chuyen_mon: "Ban Chuyên môn",
  ban_truyen_thong: "Ban Truyền thông",
  ban_su_kien: "Ban Sự kiện",
};

export function defaultTeamNameForPosition(position: Position): string | null {
  return POSITION_DEFAULT_TEAM[position] ?? null;
}
