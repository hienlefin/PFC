import { z } from "zod";

export const listQuerySchema = z.object({
  q: z.string().optional(),
  type: z.enum(["INTERNSHIP", "JOB", "COMPETITION", "SCHOLARSHIP", "ALL"]).optional(),
  sort: z.enum(["newest", "deadline"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const externalApplySchema = z.object({
  // body optional; opportunity id from path
});
