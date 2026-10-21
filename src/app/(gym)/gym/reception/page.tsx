import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WorkspaceContextService, requireGymWorkspaceAccess } from "@/modules/workspaces";
import { getGymReceptionSnapshot } from "@/modules/workspaces/application/gym-reception-query";
import { ReceptionClient } from "./reception-client";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { GymEmptyState } from "@/components/application/gym-page";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Recepção & Portaria | AtlasFit Gym",
  description: "Controle operacional da portaria, consulta rápida de alunos e status financeiro em tempo real",
};

export default async function GymReceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/gym");

  const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (context.status !== "RESOLVED" || !context.workspaceId) redirect("/select-workspace");
  const workspaceId = context.workspaceId;

  await requireGymWorkspaceAccess({ workspaceId });
  const params = await searchParams;

  const snapshot = await getGymReceptionSnapshot({
    workspaceId,
    actorUserId: session.user.id,
    unitId: params.unitId,
    page: params.page === undefined ? 1 : Number(params.page),
  }).catch((error) => {
    if (error instanceof WorkspaceAccessError && (error.statusCode === 403 || error.statusCode === 400)) {
      return null;
    }
    throw error;
  });

  if (!snapshot) {
    return (
      <GymEmptyState
        icon={ShieldAlert}
        title="Recepção indisponível neste contexto"
        description="Confira a unidade selecionada e as permissões do seu vínculo operacional."
      />
    );
  }

  return (
    <ReceptionClient
      workspaceId={workspaceId}
      students={snapshot.students}
      workspaceName={snapshot.workspace.name}
      units={snapshot.units}
      initialUnitId={snapshot.selectedUnitId}
      page={snapshot.page}
      total={snapshot.total}
      hasNext={snapshot.hasNext}
      summary={snapshot.summary}
    />
  );
}
