import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymPlanService } from "@/modules/workspaces";
import { publishGymPlanSchema } from "@/modules/workspaces/application/plan-service";
export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = publishGymPlanSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise as condições da versão." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId, capability: "enrollments.manage" });
    return NextResponse.json(await gymPlanService.publishNewVersion({ ...parsed.data, planId: id, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
    console.error("[GYM_PLAN_VERSION_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível publicar a versão." } }, { status: 500 });
  }
});