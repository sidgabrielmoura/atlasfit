import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { duplicateGymTemplate } from "@/modules/workspaces/application/gym-template-editor";
import { workoutHttpError, workoutRequestBody } from "@/modules/workspaces/application/gym-workout-http";
export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await workoutRequestBody(req) as Record<string, unknown>;
    const context = await requireGymWorkspaceAccess({ workspaceId: typeof body?.workspaceId === "string" ? body.workspaceId : "" });
    return NextResponse.json(await duplicateGymTemplate({ ...body, workspaceId: context.workspaceId, actorUserId: context.userId, templateId: id }), { status: 201 });
  } catch (error) { return workoutHttpError(error, "template.duplicate"); }
});
