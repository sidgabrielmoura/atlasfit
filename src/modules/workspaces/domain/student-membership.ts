import type { Prisma } from "@prisma/client";

/** A student profile is operational data, and cannot reinstate a revoked student grant. */
export const studentMembershipWhere: Prisma.WorkspaceMemberWhereInput = {
  OR: [
    { roleGrants: { some: { role: "STUDENT", revokedAt: null } } },
    { roleGrants: { none: {} }, OR: [{ role: "STUDENT" }, { studentProfile: { isNot: null } }] },
  ],
};

export function hasStudentMembership(member: { role: string; unitId?: string | null; studentProfile?: object | null; roleGrants: readonly { role: string; revokedAt: Date | null; unitId?: string | null }[] }): boolean {
  const history = member.roleGrants.filter(grant => grant.role === "STUDENT");
  if (member.roleGrants.length) return history.some(grant => grant.revokedAt === null && (!grant.unitId || grant.unitId === member.unitId));
  return member.role === "STUDENT" || Boolean(member.studentProfile);
}
