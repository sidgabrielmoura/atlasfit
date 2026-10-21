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
    const body = z.object({ workspaceId: z.string().min(1).max(100), targetUserId: z.string().min(1).max(100), reason: z.string().trim().max(2000).optional() }).strict().parse(await readPrivacyJsonRequest(req, 6000));
    const { workspaceId, targetUserId, reason } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: { code: "TARGET_USER_REQUIRED", message: "ID do titular de dados é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireGymPrivacyAccess(workspaceId);

    const result = await GymOffboardingService.requestDataSubjectDeletion({
      workspaceId: context.workspaceId,
      targetUserId,
      actorUserId: context.userId,
      reason: reason || undefined,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_PRIVACY_DELETE_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "PRIVACY_DELETE_FAILED", message: "Não foi possível registrar a solicitação de exclusão." } },
      { status: 400 }
    );
  }
});
