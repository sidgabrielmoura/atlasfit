import { NextResponse } from "next/server";
import { withAuditedRequest } from "@/lib/audited-request";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { transitionGymMajority } from "@/modules/workspaces/application/gym-majority-transition";
export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const workspaceId = new URL(req.url).searchParams.get("workspaceId") || "";
    const context = await requireGymWorkspaceAccess({ workspaceId });
    return NextResponse.json(await transitionGymMajority(context.workspaceId, (await params).id, context.userId), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: { message: "Transição não concluída." } }, { status: 500 }); }
});
