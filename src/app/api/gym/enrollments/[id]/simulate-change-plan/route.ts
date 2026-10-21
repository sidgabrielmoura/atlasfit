import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymEnrollmentService } from "@/modules/workspaces";
import { planChangePreviewSchema } from "@/modules/workspaces/application/enrollment-revision";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

export const POST = withAuditedRequest(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = planChangePreviewSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise as condições da contratação." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const { id } = await params;
    const result = await gymEnrollmentService.simulatePlanChange({ ...parsed.data, enrollmentId: id, actorUserId: context.userId, workspaceId: context.workspaceId });
    return NextResponse.json(result);
  } catch (error) { return gymFinanceHttpFailure(error); }
});
