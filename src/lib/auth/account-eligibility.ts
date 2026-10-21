import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";
import { parseBirthDate, civilAge } from "@/lib/privacy/civil-age";

/** Minors are represented through an adult's account, including pre-existing passwords/JWTs. */
export async function permitsOwnAccount(userId: string, db: GymTransactionClient = prisma): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { birthDate: true, workspaces: { where: { workspace: { type: "GYM" }, isMinor: true }, select: { id: true }, take: 1 } } });
  if (!user) return false;
  if (!user.birthDate) return user.workspaces.length === 0;
  const birth = parseBirthDate(user.birthDate);
  const age = birth ? civilAge(birth) : -1;
  return age >= 18 && age <= 120;
}
