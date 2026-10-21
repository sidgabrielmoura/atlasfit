import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { gymWorkoutService } from "@/modules/workspaces/application/gym-workout-service";
import { gymTemplateUpdateBody, parseGymWorkout } from "@/modules/workspaces/domain/gym-workout-contract";
import { workoutHttpError, workoutRequestBody } from "@/modules/workspaces/application/gym-workout-http";

export const PATCH = withAuditedRequest(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = parseGymWorkout(gymTemplateUpdateBody, await workoutRequestBody(req));
    const context = await requireGymWorkspaceAccess({ workspaceId: input.workspaceId });
    return NextResponse.json({ success: true, workout: await gymWorkoutService.updateGymTemplate({ ...input, workspaceId: context.workspaceId, templateId: id, actorUserId: context.userId }) });
  } catch (error) { return workoutHttpError(error, "templates.update"); }
});
export const DELETE = withAuditedRequest(async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requireGymWorkspaceAccess({ workspaceId: new URL(req.url).searchParams.get("workspaceId") || "" });
    return NextResponse.json(await gymWorkoutService.deleteGymTemplate(context.workspaceId, id, context.userId));
  } catch (error) { return workoutHttpError(error, "templates.deactivate"); }
});
