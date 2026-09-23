import { describe, expect, it } from "vitest";
import { signStorageKey, resolveSignedStorageKey } from "./storage";
import { clubFlags } from "./flags";
import { AppError } from "@/lib/errors";

describe("signed storage tokens", () => {
  it("round-trips a storage key", () => {
    const token = signStorageKey("local/club/a.pdf", 60_000);
    expect(resolveSignedStorageKey(token)).toBe("local/club/a.pdf");
  });

  it("rejects tampered token", () => {
    const token = signStorageKey("local/club/a.pdf", 60_000);
    expect(() => resolveSignedStorageKey(token.slice(0, -2) + "zz")).toThrow(
      AppError,
    );
  });
});

describe("feature flags", () => {
  it("jobs default on unless CLUB_FLAG_JOBS=0", () => {
    expect(clubFlags({}).jobs).toBe(true);
    expect(clubFlags({ CLUB_FLAG_JOBS: "0" }).jobs).toBe(false);
    expect(clubFlags({}).notify).toBe(true);
    expect(clubFlags({ CLUB_FLAG_NOTIFY: "0" }).notify).toBe(false);
    expect(clubFlags({}).rateLimit).toBe(true);
  });
});
