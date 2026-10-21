import { auth } from "@/auth";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { gymWorkoutService } from "@/modules/workspaces/application/gym-workout-service";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { GymEmptyState } from "@/components/application/gym-page";
import { canEditGymWorkoutTemplates, getGymWorkoutExerciseOptions, getGymWorkoutStudentOptions } from "@/modules/workspaces/application/gym-workout-query";
import { GymWorkoutsClient } from "./workouts-client";

export default async function GymWorkoutsPage({ searchParams }: { searchParams: Promise<{ search?: string; goal?: string; difficulty?: string; page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/gym");
  const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (context.status !== "RESOLVED" || !context.workspaceId) redirect("/select-workspace");
  const workspaceId = context.workspaceId;
  await requireGymWorkspaceAccess({ workspaceId });
  const params = await searchParams;
  try {
    const templates = await gymWorkoutService.listGymTemplates({ workspaceId, actorUserId: session.user.id, ...params, page: params.page === undefined ? 1 : Number(params.page) });
    const optionsInput = { workspaceId, actorUserId: session.user.id };
    const permissions = await canEditGymWorkoutTemplates(workspaceId, session.user.id);
    const exercises = await getGymWorkoutExerciseOptions(optionsInput);
    const students = await getGymWorkoutStudentOptions(optionsInput).catch(error => {
      if (error instanceof WorkspaceAccessError && error.statusCode === 403) return { data: [], page: 1, hasNext: false };
      throw error;
    });
    const snapshotKey = createHash("sha256").update(JSON.stringify({ workspaceId, params, templates })).digest("hex");
    return <GymWorkoutsClient key={snapshotKey} workspaceId={workspaceId} initialTemplates={templates.data}
      students={students.data} availableExercises={exercises.data} canManageWorkouts={permissions.canCreate}
      actorUserId={session.user.id} canEditOthers={permissions.canEditOthers}
      meta={templates.meta} initialSearch={params.search || ""} initialGoal={params.goal || "ALL"} initialDifficulty={params.difficulty || "ALL"} />;
  } catch (error) {
    if (error instanceof WorkspaceAccessError && (error.statusCode === 403 || error.statusCode === 400)) return <GymEmptyState icon={Dumbbell} title="Treinos indisponíveis neste contexto" description="Confira as permissões e os filtros selecionados." />;
    throw error;
  }
}
