import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymEnrollmentService } from "@/modules/workspaces";
import { cancelGymEnrollmentSchema } from "@/modules/workspaces/application/enrollment-cancellation";
export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: enrollmentId } = await params;
    const parsed = cancelGymEnrollmentSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe motivo e momento do cancelamento." } }, { status: 400 });
    // The domain revalidates authority using the actual enrollment unit inside the transaction.
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymEnrollmentService.cancelEnrollment({ ...parsed.data, enrollmentId, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
    console.error("[GYM_ENROLLMENT_CANCEL_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível cancelar a matrícula." } }, { status: 500 });
  }
});