import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymCommunicationService } from "@/modules/workspaces";
import { gymNotificationSchema } from "@/modules/workspaces/application/gym-communication-service";

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const parsed = gymNotificationSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a mensagem. Somente notificações internas são suportadas." } }, { status: 400 });
    const data = parsed.data;
    const context = await requireGymWorkspaceAccess({ workspaceId: data.workspaceId, capability: "communication.manage", unitId: data.targetFilter?.unitId || undefined });
    const result = await gymCommunicationService.sendTargetedNotification({ ...data, workspaceId: context.workspaceId, senderUserId: context.userId });
    return NextResponse.json({ ...result, message: `Notificação interna registrada para ${result.recipientsCount} destinatários.` }, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
    console.error("[GYM_NOTIFICATION_PERSIST_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível registrar a notificação interna." } }, { status: 500 });
  }
});