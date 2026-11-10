import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { readGymTemplateEditor, saveGymTemplateEditor } from "@/modules/workspaces/application/gym-template-editor";
import { deleteGymWorkoutTemplate } from "@/modules/workspaces/application/gym-workout-commands";
import { workoutHttpError, workoutRequestBody } from "@/modules/workspaces/application/gym-workout-http";

type Params = { params: Promise<{ id: string }> };
export const GET = withAuditedRequest(async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const context = await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" });
    return NextResponse.json(await readGymTemplateEditor({ workspaceId: context.workspaceId, actorUserId: context.userId, templateId: id }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return workoutHttpError(error, "template.read"); }
});
export const PUT = withAuditedRequest(async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await workoutRequestBody(req) as Record<string, unknown>;
    const context = await requireGymWorkspaceAccess({ workspaceId: typeof body?.workspaceId === "string" ? body.workspaceId : "" });
    return NextResponse.json(await saveGymTemplateEditor(context.userId, { ...body, workspaceId: context.workspaceId }, id));
  } catch (error) { return workoutHttpError(error, "template.update"); }
});
export const DELETE = withAuditedRequest(async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const context = await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" });
    await deleteGymWorkoutTemplate({ workspaceId: context.workspaceId, actorUserId: context.userId, templateId: id });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return workoutHttpError(error, "template.deactivate"); }
});
