import { AppError } from "@/lib/errors";

export const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Virus-scan policy at launch: reject until a scanner port is wired (fail closed). */
export type VirusScanStatus = "skipped_dev" | "clean" | "pending" | "blocked";

export function assertDocumentUpload(input: {
  mimeType: string;
  sizeBytes: number;
  virusScan?: VirusScanStatus;
}): void {
  if (!ALLOWED_DOCUMENT_MIME.includes(input.mimeType as (typeof ALLOWED_DOCUMENT_MIME)[number])) {
    throw new AppError("VALIDATION", `MIME not allowed: ${input.mimeType}`, 422);
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new AppError("VALIDATION", "File size out of bounds", 422);
  }
  if (input.virusScan === "blocked" || input.virusScan === "pending") {
    throw new AppError("FORBIDDEN", "File failed or awaiting virus scan", 403);
  }
}
