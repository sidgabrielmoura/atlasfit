import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { studentMembershipWhere, hasStudentMembership } from "@/modules/workspaces/domain/student-membership";
import { gymOperationalWorkspaceWhere } from "@/modules/workspaces/application/gym-license";

export function activeStudentMembershipWhere(): Prisma.WorkspaceMemberWhereInput { return {
  isActive: true,
  AND: [{ OR: [{ workspace: { type: "PERSONAL", isActive: true } }, { workspace: gymOperationalWorkspaceWhere() }] }],
  ...studentMembershipWhere,
}; }

/** A selected workspace cannot silently fall back to another academy or personal. */
export async function getStudentWorkspaceMember(userId: string) {
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("atlasfit_active_workspace_id")?.value || cookieStore.get("student_active_workspace_id")?.value;
  const include = { workspace: { select: { id: true, name: true, ownerId: true, type: true, isActive: true, slug: true, slogan: true, logoUrl: true, primaryColor: true, watermarkUrl: true, workoutCoverUrl: true, logoKey: true, watermarkKey: true, workoutCoverKey: true, createdAt: true, updatedAt: true } }, studentProfile: { select: { memberId: true } }, roleGrants: { select: { role: true, revokedAt: true, unitId: true } } } satisfies Prisma.WorkspaceMemberInclude;
  const selected = activeWorkspaceId
    ? await prisma.workspaceMember.findFirst({ where: { ...activeStudentMembershipWhere(), userId, workspaceId: activeWorkspaceId }, include })
    : await prisma.workspaceMember.findMany({ where: { ...activeStudentMembershipWhere(), userId }, include, take: 2, orderBy: { createdAt: "asc" } }).then(candidates => candidates.length === 1 ? candidates[0] : null);
  if (!selected || !hasStudentMembership(selected)) return null;
  if (selected.workspace.type === "GYM" && selected.unitId && !await prisma.gymUnit.findFirst({ where: { id: selected.unitId, workspaceId: selected.workspaceId, isActive: true }, select: { id: true } })) return null;
  return selected;
}
