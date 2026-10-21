import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { getGymWorkoutExerciseOptions } from "@/modules/workspaces/application/gym-workout-query";
import { workoutHttpError } from "@/modules/workspaces/application/gym-workout-http";

export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const workspaceId = params.get("workspaceId");
    const muscleGroupId = params.get("muscleGroupId");
    const search = params.get("search") || "";

    if (workspaceId) {
      await requireGymWorkspaceAccess({ workspaceId, anyCapability: ["workouts.read", "workspace.manage"] });
    }

    if (muscleGroupId || !params.has("page")) {
      const where: any = {
        status: { not: "REJECTED" },
        OR: [{ isOfficial: true }, { status: { in: ["READY", "APPROVED"] } }],
      };

      if (muscleGroupId) {
        where.AND = [
          {
            OR: [
              { muscleGroupId },
              { muscleGroups: { some: { id: muscleGroupId } } },
            ],
          },
        ];
      }

      if (search) {
        where.name = { contains: search, mode: "insensitive" };
      }

      const exercises = await prisma.exercise.findMany({
        where,
        include: {
          muscleGroup: true,
          muscleGroups: true,
        },
        orderBy: { name: "asc" },
        take: 150,
      });

      return NextResponse.json(exercises);
    }

    const context = await requireGymWorkspaceAccess({ workspaceId: workspaceId || "" });
    return NextResponse.json(
      await getGymWorkoutExerciseOptions({
        workspaceId: context.workspaceId,
        actorUserId: context.userId,
        search,
        page: params.has("page") ? Number(params.get("page")) : 1,
      })
    );
  } catch (error) {
    return workoutHttpError(error, "options.exercises");
  }
});
