import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { getGymStaffPageData } from "@/modules/workspaces/application/gym-staff-query";
import { GymStaffClient } from "./staff-client";

export const metadata = { title: "Equipe | AtlasFit Gym" };
export default async function GymStaffPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/gym");
  const workspaceId = await WorkspaceContextService.getActiveWorkspaceIdFromCookie();
  if (!workspaceId) redirect("/select-workspace");
  const context = await requireGymWorkspaceAccess({ workspaceId });
  const data = await getGymStaffPageData(context.workspaceId, context.userId);
  return <GymStaffClient workspaceId={context.workspaceId} workspaceName={context.workspaceName}
    initialStaff={data.staff.data} initialInvitations={data.invitations.data} initialStaffTotal={data.staff.total} initialInvitationTotal={data.invitations.total}
    maxStaff={data.maxStaff} canManageStaff={data.canManageGlobal || data.units.length > 0} canManageGlobal={data.canManageGlobal} units={data.units} currentUserId={context.userId} />;
}
