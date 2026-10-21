import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorkspaceContextService, requireGymWorkspaceAccess } from "@/modules/workspaces";
import { listGymAdministrativeReviewResources } from "@/modules/workspaces/application/gym-administrative-review";
import { GymReconciliationClient } from "./reconciliation-client";
export const metadata = { title: "Revisão de contratos e saldos | AtlasFit Gym" };
export default async function Page() {
  const session = await auth(); if (!session?.user?.id) redirect("/auth/gym");
  const resolved = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (resolved.status !== "RESOLVED" || !resolved.workspaceId) redirect("/select-workspace");
  const context = await requireGymWorkspaceAccess({ workspaceId: resolved.workspaceId });
  const initial = await listGymAdministrativeReviewResources(context.workspaceId, context.userId, "CONTRACT");
  return <GymReconciliationClient workspaceId={context.workspaceId} initial={initial} />;
}
