import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { saveGymTemplateEditor } from "@/modules/workspaces/application/gym-template-editor";
import { workoutHttpError, workoutRequestBody } from "@/modules/workspaces/application/gym-workout-http";
export { GET } from "./templates/route";
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = await workoutRequestBody(req) as Record<string, unknown>;
    const context = await requireGymWorkspaceAccess({ workspaceId: typeof body?.workspaceId === "string" ? body.workspaceId : "" });
    return NextResponse.json(await saveGymTemplateEditor(context.userId, { ...body, workspaceId: context.workspaceId }), { status: 201 });
  } catch (error) { return workoutHttpError(error, "template.create"); }
});
