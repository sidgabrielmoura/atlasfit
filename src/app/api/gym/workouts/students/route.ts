import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { getGymWorkoutStudentOptions } from "@/modules/workspaces/application/gym-workout-query";
import { workoutHttpError } from "@/modules/workspaces/application/gym-workout-http";
export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const context = await requireGymWorkspaceAccess({ workspaceId: params.get("workspaceId") || "" });
    return NextResponse.json(await getGymWorkoutStudentOptions({ workspaceId: context.workspaceId, actorUserId: context.userId, search: params.get("search") || "", page: params.has("page") ? Number(params.get("page")) : 1 }));
  } catch (error) { return workoutHttpError(error, "options.students"); }
});
