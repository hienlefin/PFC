import { NextResponse } from "next/server";
import { isUser, requirePermission } from "@/lib/auth";
import { publishListing } from "@/server/commerce";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("admin.publish");
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  try {
    const listing = await publishListing(id, user.id);
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
