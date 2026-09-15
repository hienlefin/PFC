import { NextResponse } from "next/server";
import { z } from "zod";
import { isUser, requireUser } from "@/lib/auth";
import { addReview } from "@/server/commerce";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const review = await addReview(user.id, id, parsed.data.rating, parsed.data.body);
    return NextResponse.json({ ok: true, review });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
