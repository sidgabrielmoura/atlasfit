import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { gymWorkoutService } from "@/modules/workspaces/application/gym-workout-service";
import { gymTemplateCreateBody, parseGymWorkout } from "@/modules/workspaces/domain/gym-workout-contract";
import { workoutHttpError, workoutRequestBody } from "@/modules/workspaces/application/gym-workout-http";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const context = await requireGymWorkspaceAccess({ workspaceId: params.get("workspaceId") || "" });
    return NextResponse.json(await gymWorkoutService.listGymTemplates({ workspaceId: context.workspaceId, actorUserId: context.userId,
      search: params.get("search") || undefined, goal: params.get("goal") || undefined, difficulty: params.get("difficulty") || undefined,
      page: params.has("page") ? Number(params.get("page")) : 1, limit: params.has("limit") ? Number(params.get("limit")) : 20 }));
  } catch (error) { return workoutHttpError(error, "templates.list"); }
});
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const input = parseGymWorkout(gymTemplateCreateBody, await workoutRequestBody(req));
    const context = await requireGymWorkspaceAccess({ workspaceId: input.workspaceId });
    return NextResponse.json({ success: true, workout: await gymWorkoutService.createGymTemplate({ ...input, workspaceId: context.workspaceId, creatorUserId: context.userId }) }, { status: 201 });
  } catch (error) { return workoutHttpError(error, "templates.create"); }
});
