import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  GymOffboardingService,
} from "@/modules/workspaces";

interface RouteParams {
  params: Promise<{ id: string }>;
}
const cancelSchema = z.object({ workspaceId: z.string().min(1).max(100), reason: z.string().trim().min(1).max(2000), immediate: z.literal(true).default(true) }).strict();

export const POST = withAuditedRequest(async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: studentMemberId } = await params;
    const parsed = cancelSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe um motivo. Cancelamento futuro é realizado na matrícula." } }, { status: 400 });
    const { workspaceId, reason, immediate } = parsed.data;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: { code: "REASON_REQUIRED", message: "Motivo do cancelamento do aluno é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      anyCapability: ["students.manage", "workspace.manage"],
    });

    const result = await GymOffboardingService.cancelStudent({
      workspaceId: context.workspaceId,
      studentMemberId,
      actorUserId: context.userId,
      reason,
      immediate,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Corpo inválido." } }, { status: 400 });
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_STUDENT_CANCEL_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "STUDENT_CANCEL_FAILED", message: "Falha ao cancelar aluno." } },
      { status: 500 }
    );
  }
});
