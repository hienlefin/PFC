import { describe, expect, it } from "vitest";
import {
  DATA_CLASSIFICATION,
  RETENTION_MONTHS,
  isRetentionElapsed,
  RETENTION_MS,
} from "./data-class";
import { CAPACITY, REQUIRED_INDEXES } from "./capacity";
import { assertDocumentUpload, MAX_DOCUMENT_BYTES } from "./storage-policy";
import { AppError } from "@/lib/errors";

describe("P1.8 data classification", () => {
  it("marks membership and docs confidential with 24 month retention", () => {
    expect(DATA_CLASSIFICATION.membershipPii).toBe("confidential");
    expect(DATA_CLASSIFICATION.internalDocument).toBe("confidential");
    expect(RETENTION_MONTHS).toBe(24);
  });

  it("retention elapsed after 24 months", () => {
    const ended = Date.UTC(2024, 0, 1);
    expect(isRetentionElapsed(ended, ended + RETENTION_MS)).toBe(true);
    expect(isRetentionElapsed(ended, ended + RETENTION_MS - 1)).toBe(false);
  });
});

describe("P1.10 capacity", () => {
  it("matches ADR-004 numbers", () => {
    expect(CAPACITY.membersPerClub).toBe(5_000);
    expect(CAPACITY.p95ClubListMs).toBe(300);
    expect(REQUIRED_INDEXES).toContain("memberships_club_status_idx");
    expect(REQUIRED_INDEXES).toContain("tasks_deadline_idx");
    expect(REQUIRED_INDEXES).toContain("tasks_club_deadline_idx");
  });
});

describe("P3.9 storage policy", () => {
  it("rejects disallowed mime with 422", () => {
    try {
      assertDocumentUpload({
        mimeType: "application/x-msdownload",
        sizeBytes: 100,
        virusScan: "skipped_dev",
      });
      expect.fail("expected throw");
    } catch (err) {
      expect((err as AppError).status).toBe(422);
    }
  });

  it("rejects oversize", () => {
    expect(() =>
      assertDocumentUpload({
        mimeType: "application/pdf",
        sizeBytes: MAX_DOCUMENT_BYTES + 1,
        virusScan: "skipped_dev",
      }),
    ).toThrow(AppError);
  });

  it("fail-closed on blocked scan", () => {
    try {
      assertDocumentUpload({
        mimeType: "application/pdf",
        sizeBytes: 100,
        virusScan: "blocked",
      });
      expect.fail("expected throw");
    } catch (err) {
      expect((err as AppError).status).toBe(403);
    }
  });

  it("accepts pdf in bounds", () => {
    expect(() =>
      assertDocumentUpload({
        mimeType: "application/pdf",
        sizeBytes: 1024,
        virusScan: "skipped_dev",
      }),
    ).not.toThrow();
  });
});
