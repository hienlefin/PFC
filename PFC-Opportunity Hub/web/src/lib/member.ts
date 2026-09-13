import { cookies } from "next/headers";

export const DEMO_MEMBER_ID = "member_demo_linh";
export const DEMO_PROVIDER_MEMBER_ID = "member_demo_provider";
export const DEMO_REVIEWER_ID = "member_demo_provider"; // demo: provider account also reviews
export const MEMBER_COOKIE = "pfc_member_id";

/** P0/P1 demo identity — production: Platform session */
export async function getMemberId(): Promise<string> {
  const jar = await cookies();
  return jar.get(MEMBER_COOKIE)?.value || DEMO_MEMBER_ID;
}

export async function getProviderProfileId(): Promise<string | null> {
  const memberId = await getMemberId();
  const { prisma } = await import("@/lib/prisma");
  const profile = await prisma.providerProfile.findFirst({
    where: { memberId },
    orderBy: { createdAt: "asc" },
  });
  return profile?.id ?? null;
}
