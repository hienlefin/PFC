import { describe, expect, it } from "vitest";
import {
  defaultTeamNameForPosition,
  normalizeTeamName,
  sanitizeTeamName,
} from "./team-policy";

describe("team-policy", () => {
  it("normalizes case and whitespace (vi)", () => {
    expect(normalizeTeamName("  Ban Truyền Thông  ")).toBe(
      normalizeTeamName("ban truyền thông"),
    );
    expect(sanitizeTeamName("  Ban   CM  ")).toBe("Ban CM");
  });

  it("maps trưởng ban positions to canonical team names", () => {
    expect(defaultTeamNameForPosition("ban_truyen_thong")).toBe(
      "Ban Truyền thông",
    );
    expect(defaultTeamNameForPosition("member")).toBeNull();
  });
});
