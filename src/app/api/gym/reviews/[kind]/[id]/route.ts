import { NextResponse } from "next/server";
import { withAuditedRequest } from "@/lib/audited-request";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { gymReviewKind, gymReviewSchema, previewGymAdministrativeReview, commitGymAdministrativeReview } from "@/modules/workspaces/application/gym-administrative-review";
type Params = { params: Promise<{ kind: string; id: string }> };
function invalid() { return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados da decisão administrativa." } }, { status: 400 }); }
function failure(error: unknown) { return handleWorkspaceAccessError(error) || (error instanceof SyntaxError ? invalid() : NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a revisão." } }, { status: 500 })); }
export const GET = withAuditedRequest(async function GET(req: Request, { params }: Params) {
  try {
    const target = await params, kind = gymReviewKind.safeParse(target.kind), workspaceId = new URL(req.url).searchParams.get("workspaceId");
    if (!kind.success || !workspaceId) return invalid();
    const context = await requireGymWorkspaceAccess({ workspaceId });
    return NextResponse.json(await previewGymAdministrativeReview(context.workspaceId, context.userId, kind.data, target.id));
  } catch (error) { return failure(error); }
});
export const POST = withAuditedRequest(async function POST(req: Request, { params }: Params) {
  try {
    const target = await params, kind = gymReviewKind.safeParse(target.kind), parsed = gymReviewSchema.safeParse(await req.json());
    if (!kind.success || !parsed.success) return invalid();
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await commitGymAdministrativeReview({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId, kind: kind.data, resourceId: target.id }));
  } catch (error) { return failure(error); }
});
