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

// POST /api/gym/enrollments/[id]/subscription: Configura recorrência (LOCAL ou PROVIDER Asaas)
export const POST = withAuditedRequest(async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: enrollmentId } = await params;
    const body = await req.json();
    const {
      workspaceId,
      recurrenceMode,
      billingType,
      customFirstDueDate,
      creditCardToken,
      creditCardData
    } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    if (!recurrenceMode || !billingType) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Modo de recorrência e tipo de cobrança são obrigatórios." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      requiredCapabilities: ["enrollments.manage"],
    });

    const result = await gymSubscriptionService.setupEnrollmentSubscription({
      workspaceId: context.workspaceId,
      enrollmentId,
      actorUserId: context.userId,
      recurrenceMode,
      billingType,
      customFirstDueDate: customFirstDueDate ? new Date(customFirstDueDate) : undefined,
      creditCardToken,
      creditCardData
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[API_GYM_ENROLLMENT_SUBSCRIPTION_SETUP_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      {
        error: {
          code: error.code || "SUBSCRIPTION_SETUP_FAILED",
          message: "Erro ao configurar recorrência da matrícula."
        }
      },
      { status: error.statusCode || 400 }
    );
  }
});

// DELETE /api/gym/enrollments/[id]/subscription: Cancela a assinatura externa e desativa auto-renovação
export const DELETE = withAuditedRequest(async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id: enrollmentId } = await params;
    const body = await req.json();
    const { workspaceId, cancellationReason, immediate } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    if (!cancellationReason || !cancellationReason.trim()) {
      return NextResponse.json(
        { error: { code: "REASON_REQUIRED", message: "Motivo do cancelamento da assinatura é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      requiredCapabilities: ["enrollments.manage"],
    });

    const result = await gymSubscriptionService.cancelSubscription({
      workspaceId: context.workspaceId,
      enrollmentId,
      actorUserId: context.userId,
      cancellationReason,
      immediate: Boolean(immediate)
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[API_GYM_ENROLLMENT_SUBSCRIPTION_CANCEL_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      {
        error: {
          code: error.code || "SUBSCRIPTION_CANCEL_FAILED",
          message: "Erro ao cancelar assinatura."
        }
      },
      { status: error.statusCode || 400 }
    );
  }
});
