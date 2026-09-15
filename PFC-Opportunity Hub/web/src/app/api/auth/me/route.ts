import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  return NextResponse.json(user);
}
