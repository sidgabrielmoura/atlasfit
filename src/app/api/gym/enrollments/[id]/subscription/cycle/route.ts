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

// POST /api/gym/enrollments/[id]/subscription/cycle: Gera fatura para novo ciclo com proteção anti-duplicação
export const POST = withAuditedRequest(async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: enrollmentId } = await params;
    const body = await req.json();
    const { workspaceId, competenceMonth, dueDate } = body;

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

    const result = await gymSubscriptionService.generateCycleInvoice({
      workspaceId: context.workspaceId,
      enrollmentId,
      actorUserId: context.userId,
      competenceMonth,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[API_GYM_ENROLLMENT_CYCLE_GENERATE_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      {
        error: {
          code: error.code || "CYCLE_GENERATION_FAILED",
          message: "Erro ao gerar fatura do ciclo."
        }
      },
      { status: error.statusCode || 400 }
    );
  }
});
