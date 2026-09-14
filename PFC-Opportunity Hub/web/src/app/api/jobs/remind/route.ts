import { NextRequest, NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/auth";
import { runRemindJob } from "@/server/jobs/opportunity-jobs";

export async function POST(req: NextRequest) {
  const denied = assertCronSecret(req.headers.get("x-cron-secret"));
  if (denied) return denied;
  const result = await runRemindJob();
  return NextResponse.json({ ok: true, job: "remind", ...result });
}
