import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { avatarResponse } from "@/lib/avatar-response";
import { assertChatConversation } from "@/modules/workspaces/application/chat-authority";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { withRequestMemo } from "@/lib/request-memo";

export const GET = withRequestMemo(async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const params = new URL(req.url).searchParams, userId = params.get("userId"), conversationId = params.get("conversationId");
  if (!userId || !conversationId) return new Response(null, { status: 400 });
  try {
    const conversation = await assertChatConversation(conversationId, session.user.id);
    if (userId !== session.user.id && !conversation.participants.some(participant => participant.userId === userId)) return new Response(null, { status: 403 });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
    return avatarResponse(user?.image);
  } catch (error) { const denied = handleWorkspaceAccessError(error); if (denied) return denied; throw error; }
});
