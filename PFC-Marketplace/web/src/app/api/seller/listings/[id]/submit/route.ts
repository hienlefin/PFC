import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { submitListing } from "@/server/commerce";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  if (user.role !== "SELLER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const listing = await submitListing(id, user.id);
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
