import { z } from "zod";
import { requireGymPrivacyAccess } from "@/modules/workspaces/application/gym-privacy-authority";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  GymOffboardingService,
} from "@/modules/workspaces";

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = z.object({ workspaceId: z.string().min(1).max(100), targetUserId: z.string().min(1).max(100).optional(), requestId: z.string().min(1).max(100).optional() }).strict().parse(await readPrivacyJsonRequest(req, 4096));
    const { workspaceId, targetUserId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = body.requestId ? await requireGymPrivacyAccess(workspaceId) : await requireWorkspaceAccess({
      workspaceId,
      capability: "privacy.manage",
    });

    const finalTargetUserId = targetUserId || context.userId;

    const dossier = await GymOffboardingService.exportDataSubjectDossier({
      workspaceId: context.workspaceId,
      targetUserId: finalTargetUserId,
      actorUserId: context.userId,
      requestId: body.requestId,
    });

    return NextResponse.json({ data: dossier }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_PRIVACY_EXPORT_ERROR] Exportação não concluída.");
    return NextResponse.json(
      { error: { code: "PRIVACY_EXPORT_FAILED", message: "Pacote não gerado. Confira o pedido e os arquivos e tente novamente." } },
      { status: 400 }
    );
  }
});
