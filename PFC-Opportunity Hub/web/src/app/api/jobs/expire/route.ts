import { NextResponse } from "next/server";
import { runExpireJob } from "@/server/jobs/opportunity-jobs";

/** Manual/cron trigger — map Inngest-style worker */
export async function POST() {
  const result = await runExpireJob();
  return NextResponse.json({ ok: true, job: "expire", ...result });
}

export async function GET() {
  return POST();
}
