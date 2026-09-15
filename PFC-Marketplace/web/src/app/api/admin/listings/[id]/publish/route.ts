import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { publishListing } from "@/server/commerce";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const listing = await publishListing(id, user.id);
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
