import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  gymSubscriptionService
} from "@/modules/workspaces";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/gym/enrollments/[id]/subscription/reconcile: Sincroniza pagamentos da assinatura externa com faturas locais
export const POST = withAuditedRequest(async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: enrollmentId } = await params;
    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      requiredCapabilities: ["enrollments.manage"],
    });

    const result = await gymSubscriptionService.reconcileSubscription({
      workspaceId: context.workspaceId,
      enrollmentId,
      actorUserId: context.userId
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[API_GYM_ENROLLMENT_SUBSCRIPTION_RECONCILE_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      {
        error: {
          code: error.code || "RECONCILIATION_FAILED",
          message: "Erro ao reconciliar assinatura com o gateway."
        }
      },
      { status: error.statusCode || 400 }
    );
  }
});
