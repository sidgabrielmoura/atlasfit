import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { gymWorkoutService } from "@/modules/workspaces/application/gym-workout-service";
import { gymWorkoutAssignmentBody, parseGymWorkout } from "@/modules/workspaces/domain/gym-workout-contract";
import { workoutHttpError, workoutRequestBody } from "@/modules/workspaces/application/gym-workout-http";

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const input = parseGymWorkout(gymWorkoutAssignmentBody, await workoutRequestBody(req));
    const context = await requireGymWorkspaceAccess({ workspaceId: input.workspaceId });
    const workout = await gymWorkoutService.assignWorkoutToStudent({ ...input, workspaceId: context.workspaceId, actorUserId: context.userId });
    return NextResponse.json({ success: true, message: "Ficha prescrita.", workout }, { status: 201 });
  } catch (error) { return workoutHttpError(error, "students.assign"); }
});
