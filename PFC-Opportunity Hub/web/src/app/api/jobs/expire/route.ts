import { NextRequest, NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/auth";
import { runExpireJob } from "@/server/jobs/opportunity-jobs";

export async function POST(req: NextRequest) {
  const denied = assertCronSecret(req.headers.get("x-cron-secret"));
  if (denied) return denied;
  const result = await runExpireJob();
  return NextResponse.json({ ok: true, job: "expire", ...result });
}
