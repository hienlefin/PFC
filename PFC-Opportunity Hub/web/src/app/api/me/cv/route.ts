import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mustMember } from "@/lib/member";
import { rateLimit } from "@/lib/rate-limit";
import { writePrivateFile } from "@/server/storage/private-files";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(req: NextRequest) {
  const memberId = await mustMember();
  if (memberId instanceof NextResponse) return memberId;
  if (!rateLimit(`cv:${memberId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Quá nhiều lần tải CV" }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Chỉ nhận PDF/DOC/DOCX, tối đa 5MB" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" && !bytes.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
    return NextResponse.json({ error: "File PDF không hợp lệ" }, { status: 400 });
  }

  const storageKey = randomBytes(32).toString("hex");
  await writePrivateFile(storageKey, bytes);
  const row = await prisma.oppAttachment.create({
    data: {
      ownerMemberId: memberId,
      storageKey,
      fileName: file.name.slice(0, 120),
      mimeType: file.type,
      byteSize: bytes.length,
    },
    select: { id: true },
  });
  return NextResponse.json({ attachmentId: row.id }, { status: 201 });
}
