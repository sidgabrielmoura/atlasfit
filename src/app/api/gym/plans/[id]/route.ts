import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymPlanService } from "@/modules/workspaces";
import { updateGymPlanSchema } from "@/modules/workspaces/application/plan-service";
type RouteParams = { params: Promise<{ id: string }> };
export const GET = withAuditedRequest(async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" });
    return NextResponse.json(await gymPlanService.getPlanById(id, context.workspaceId, context.userId,Number(new URL(req.url).searchParams.get("versionPage") || "1")));
  } catch (error) { return failure(error); }
});
export const PATCH = withAuditedRequest(async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsed = updateGymPlanSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados do plano." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId, capability: "enrollments.manage" });
    return NextResponse.json(await gymPlanService.updatePlanMetadata({ ...parsed.data, planId: id, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) { return failure(error); }
});
function failure(error: unknown) {
  const accessError = handleWorkspaceAccessError(error);
  if (accessError) return accessError;
  if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
  console.error("[GYM_PLAN_DETAIL_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação do plano." } }, { status: 500 });
}