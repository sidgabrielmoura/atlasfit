import { assertChatWorkspace } from "@/modules/workspaces/application/chat-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getGymChatContacts } from "@/modules/workspaces/application/gym-chat-contacts";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return new NextResponse("workspaceId é obrigatório.", { status: 400 });
    }

    const userId = session.user.id;
    await assertChatWorkspace(workspaceId, userId);
    if ((await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { type: true } })).type === "GYM") return NextResponse.json(await getGymChatContacts(workspaceId, userId));

    // Get current user's membership
    const userMember = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId, isActive: true },
    });

    if (!userMember) {
      return new NextResponse("Você não é membro deste workspace.", { status: 403 });
    }

    let membersQuery: any = {
      workspaceId,
      isActive: true,
      userId: { not: userId },
    };

    // If current user is a STUDENT, they can only contact TRAINERs/OWNERs/ASSISTANTs
    if (userMember.role === "STUDENT") {
      membersQuery.role = { in: ["OWNER", "TRAINER", "ASSISTANT"] };
    }

    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: membersQuery,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const contacts = workspaceMembers.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
    }));

    return NextResponse.json(contacts);
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[API Chat Contacts GET] Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
});
