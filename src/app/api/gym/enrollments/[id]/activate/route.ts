import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymEnrollmentService } from "@/modules/workspaces";
import { activateGymEnrollmentSchema } from "@/modules/workspaces/application/enrollment-activation";

export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: enrollmentId } = await params;
    const parsed = activateGymEnrollmentSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a solicitação de ativação." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymEnrollmentService.activateEnrollment({ ...parsed.data, enrollmentId, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
    console.error("[GYM_ENROLLMENT_ACTIVATION_FAILED]", { code: "INTERNAL_ERROR" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível ativar a matrícula." } }, { status: 500 });
  }
});