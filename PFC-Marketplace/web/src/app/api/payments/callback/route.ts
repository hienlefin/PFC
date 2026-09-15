import { NextResponse } from "next/server";
import { completePaymentFromCallback } from "@/server/commerce";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  try {
    const result = await completePaymentFromCallback(params);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Callback failed" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  try {
    const body = await req.json().catch(() => ({}));
    Object.assign(params, body);
    const result = await completePaymentFromCallback(params);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Callback failed" }, { status: 400 });
  }
}
