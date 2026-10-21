import type { Prisma } from "@prisma/client";

/** A legacy PERSONAL billing without workspace is owned by the selected personal's account. */
export function personalStudentBillingScope(studentUserId: string, workspaceId: string, ownerId: string): Prisma.StudentBillingWhereInput {
  return {
    studentUserId,
    OR: [
      { workspaceId, workspace: { type: "PERSONAL" } },
      { workspaceId: null, account: { personalUserId: ownerId, workspaceId: null } },
    ],
  };
}
