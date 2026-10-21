import { NextResponse } from "next/server";
import { withAuditedRequest } from "@/lib/audited-request";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { readGymAdvancedTemplate, editGymAdvancedTemplate } from "@/modules/workspaces/application/gym-workout-advanced";
import { gymAdvancedEditSchema } from "@/modules/workspaces/domain/gym-workout-advanced";
import { parseGymWorkout } from "@/modules/workspaces/domain/gym-workout-contract";
import { workoutHttpError, workoutRequestBody } from "@/modules/workspaces/application/gym-workout-http";
export const GET = withAuditedRequest(async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, context = await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" });
    return NextResponse.json({ data: await readGymAdvancedTemplate({ workspaceId: context.workspaceId, actorUserId: context.userId, templateId: id }) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return workoutHttpError(error, "templates.advanced.read"); }
});
export const PATCH = withAuditedRequest(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, input = parseGymWorkout(gymAdvancedEditSchema, await workoutRequestBody(req)), context = await requireGymWorkspaceAccess({ workspaceId: input.workspaceId });
    return NextResponse.json({ success: true, workout: await editGymAdvancedTemplate({ workspaceId: context.workspaceId, actorUserId: context.userId, templateId: id }, input) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return workoutHttpError(error, "templates.advanced.update"); }
});
