import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymPlanService } from "@/modules/workspaces";
import { createGymPlanSchema } from "@/modules/workspaces/application/plan-service";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const query = new URL(req.url).searchParams;
    const context = await requireGymWorkspaceAccess({ workspaceId: query.get("workspaceId") || "" });
    return NextResponse.json(await gymPlanService.listPlanPage(context.workspaceId, { includeInactive: query.get("includeInactive") === "true", page: Number(query.get("page") || "1"), limit: Number(query.get("limit") || "20"), search:query.get("search") || undefined, status: (query.get("status") || undefined) as "ALL" | "ACTIVE" | "INACTIVE" | undefined }, context.userId));
  } catch (error) { return failure(error); }
});
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const parsed = createGymPlanSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise as condições do plano." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId, capability: "enrollments.manage" });
    return NextResponse.json(await gymPlanService.createPlan({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return failure(error); }
});
function failure(error: unknown) {
  const accessError = handleWorkspaceAccessError(error);
  if (accessError) return accessError;
  if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
  console.error("[GYM_PLAN_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação do plano." } }, { status: 500 });
}
