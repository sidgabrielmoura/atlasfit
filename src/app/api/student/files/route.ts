import { withRequestMemo } from "@/lib/request-memo";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function handleGET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Fetch active student membership
    const member = await getStudentWorkspaceMember(session.user.id);

    if (!member) {
      return new NextResponse("Membro do workspace ativo não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;
    if (member.workspace.type === "GYM") await authorizeGymStudent(workspaceId, member.id, session.user.id, "health.read.assigned", { allowSelf: true });

    // 2. Fetch all files shared with this student in the workspace
    const files = await prisma.studentFile.findMany({
      where: {
        studentId: session.user.id,
        workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("GET student files error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
