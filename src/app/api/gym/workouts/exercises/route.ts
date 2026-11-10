import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { getGymWorkoutExerciseOptions } from "@/modules/workspaces/application/gym-workout-query";
import { workoutHttpError } from "@/modules/workspaces/application/gym-workout-http";
import { gymExerciseVisibility } from "@/modules/workspaces/application/gym-workout-commands";
import { findPublicExerciseMatches } from "@/lib/migration/matching/exercise-catalog-matches";
import { getPublicExerciseCatalog } from "@/lib/cache/public-data";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { z } from "zod";

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
        ...gymExerciseVisibility,
      };

      if (muscleGroupId) {
        where.AND = [...(Array.isArray(where.AND) ? where.AND : []),
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

export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = z.object({ workspaceId: z.string().min(1).max(100), names: z.array(z.string().trim().min(1).max(200)).max(100) }).strict().safeParse(await readPrivacyJsonRequest(req, 32_768));
    if (!body.success) return NextResponse.json({ error: { message: "Nomes de exercícios inválidos." } }, { status: 400 });
    await requireGymWorkspaceAccess({ workspaceId: body.data.workspaceId, anyCapability: ["students.manage", "workouts.read", "workspace.manage"] });
    return NextResponse.json({ matches: await findPublicExerciseMatches(body.data.names, getPublicExerciseCatalog) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return workoutHttpError(error, "options.exercise-matches"); }
});
