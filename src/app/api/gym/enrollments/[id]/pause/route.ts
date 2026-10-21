import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymEnrollmentService } from "@/modules/workspaces";
import { pauseGymEnrollmentSchema } from "@/modules/workspaces/application/enrollment-pause";

export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: enrollmentId } = await params;
    const parsed = pauseGymEnrollmentSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe intervalo válido, motivo e opção de extensão da pausa." } }, { status: 400 });
    // Actual resource-unit authority is checked again inside the domain transaction.
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymEnrollmentService.pauseEnrollment({ ...parsed.data, enrollmentId, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
    console.error("[GYM_ENROLLMENT_PAUSE_FAILED]", { enrollmentOperation: "pause", code: "INTERNAL_ERROR" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível atualizar a pausa da matrícula." } }, { status: 500 });
  }
});
