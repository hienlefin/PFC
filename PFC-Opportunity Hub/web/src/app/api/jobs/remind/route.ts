import { NextResponse } from "next/server";
import { runRemindJob } from "@/server/jobs/opportunity-jobs";

export async function POST() {
  const result = await runRemindJob();
  return NextResponse.json({ ok: true, job: "remind", ...result });
}

export async function GET() {
  return POST();
}
