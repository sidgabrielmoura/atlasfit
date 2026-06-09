import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function getStudentWorkspaceMember(userId: string) {
  try {
    const cookieStore = await cookies();
    const activeWorkspaceId = cookieStore.get("student_active_workspace_id")?.value;

    if (activeWorkspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspaceId: activeWorkspaceId,
          role: "STUDENT",
          isActive: true,
        },
        include: {
          workspace: true,
        },
      });
      if (member) return member;
    }
  } catch (err) {
    console.error("Failed to read student active workspace cookie:", err);
  }

  // Fallback to the first active student membership
  return prisma.workspaceMember.findFirst({
    where: {
      userId,
      role: "STUDENT",
      isActive: true,
    },
    include: {
      workspace: true,
    },
  });
}
