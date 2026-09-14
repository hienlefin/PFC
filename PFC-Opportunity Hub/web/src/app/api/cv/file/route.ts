import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signingSecret } from "@/lib/signing-secret";
import { verifyAttachmentToken } from "@/domain/storage/signed-url";
import { readPrivateFile, safeDownloadName } from "@/server/storage/private-files";

export async function GET(req: NextRequest) {
  const secret = signingSecret();
  if (!secret) return NextResponse.json({ error: "CV signing is not configured" }, { status: 503 });
  const token = req.nextUrl.searchParams.get("token") || "";
  const parsed = verifyAttachmentToken(token, secret);
  if (!parsed) return NextResponse.json({ error: "Link hết hạn hoặc không hợp lệ" }, { status: 401 });

  const attachment = await prisma.oppAttachment.findUnique({ where: { id: parsed.attachmentId } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await readPrivateFile(attachment.storageKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${safeDownloadName(attachment.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
