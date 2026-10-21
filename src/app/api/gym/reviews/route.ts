import { NextResponse } from "next/server";
import { withAuditedRequest } from "@/lib/audited-request";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { gymReviewKind, listGymAdministrativeReviewResources } from "@/modules/workspaces/application/gym-administrative-review";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const workspaceId = params.get("workspaceId"), kind = gymReviewKind.safeParse(params.get("kind")), page = Number(params.get("page") || "1");
    if (!workspaceId || !kind.success || !Number.isSafeInteger(page) || page < 1 || page > 10000) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe academia, tipo e página da revisão." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId });
    return NextResponse.json(await listGymAdministrativeReviewResources(context.workspaceId, context.userId, kind.data, page));
  } catch (error) {
    const response = handleWorkspaceAccessError(error); if (response) return response;
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível consultar as revisões." } }, { status: 500 });
  }
});
