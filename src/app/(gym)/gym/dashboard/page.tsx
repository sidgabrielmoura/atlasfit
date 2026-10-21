import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  WorkspaceContextService,
  EntitlementsService,
  requireGymWorkspaceAccess,
  getGymDashboardMetrics,
} from "@/modules/workspaces";
import { GymDashboardClient } from "./dashboard-client";

export const metadata = {
  title: "Visão Geral da Academia | AtlasFit",
  description: "Indicadores estratégicos, métricas de performance e rotina operacional da academia",
};

export default async function GymDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/gym");
  }

  const wsContext = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (wsContext.status !== "RESOLVED" || !wsContext.workspaceId) {
    redirect("/select-workspace");
  }

  const workspaceId = wsContext.workspaceId;
  const context = await requireGymWorkspaceAccess({ workspaceId });

  // 1. Coleta consolidada de dados em paralelo no servidor
  const [workspace, entitlements, dashboardData] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    }),
    EntitlementsService.resolveEntitlements(workspaceId),
    getGymDashboardMetrics({
      workspaceId,
      actorUserId: context.userId,
    }),
  ]);

  if (!workspace) {
    redirect("/select-workspace");
  }

  const hasFinancialAccess = dashboardData.overview.access.financial;

  return (
    <GymDashboardClient
      initialData={dashboardData}
      workspaceName={workspace.name}
      workspaceId={workspaceId}
      planName={entitlements.planName}
      isTrial={entitlements.isTrial}
      limits={entitlements.limits}
      hasFinancialAccess={hasFinancialAccess}
    />
  );
}
