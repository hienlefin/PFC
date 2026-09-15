import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Launch adapter for Platform identity.
 * Opportunity must not invent a second user system when PFC Auth exists —
 * replace this file with a call to Platform member_id. There is no Platform
 * Auth service in this repo yet, so the local Member row is the directory.
 */
export type DirectoryMember = {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
  passwordHash: string;
};

export async function findMemberByEmail(email: string): Promise<DirectoryMember | null> {
  return prisma.member.findUnique({ where: { email } });
}
