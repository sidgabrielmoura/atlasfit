import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGymStudentSelectors } from "@/modules/workspaces/application/gym-selectors";
import { requireWorkspaceAccess, gymStudentService, WorkspaceContextService } from "@/modules/workspaces";
import { GymStudentsClient } from "./students-client";

export const metadata = {
  title: "Alunos & Matrículas | AtlasFit Gym",
  description: "Gestão completa de alunos, matrículas assistidas e carteira de treinadores",
};

export default async function GymStudentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/gym");
  }

  const wsContext = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (wsContext.status !== "RESOLVED" || !wsContext.workspaceId) {
    redirect("/select-workspace");
  }

  const context = await requireWorkspaceAccess({
    workspaceId: wsContext.workspaceId,
  });

  if (context.workspaceType !== "GYM") {
    redirect("/dashboard");
  }

  const [initialStudentsData, { trainers, units }] = await Promise.all([
    gymStudentService.listStudents({ workspaceId: context.workspaceId, actorContext: context, page: 1, limit: 20, status: "ALL" }),
    getGymStudentSelectors(context.workspaceId, context.userId),
  ]);
  const canManageStudents = units.some(unit => unit.canManageStudents);

  return (
    <GymStudentsClient
      workspaceId={context.workspaceId}
      workspaceName={context.workspaceName}
      initialStudentsData={JSON.parse(JSON.stringify(initialStudentsData))}
      staffTrainers={trainers}
      units={units}
      canManageStudents={canManageStudents}
      isTrainerRestricted={
        context.memberRole === "TRAINER" && !context.capabilities.has("students.manage")
      }
    />
  );
}
