import { getGymOwnershipCandidates } from "@/modules/workspaces/application/gym-selectors";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireWorkspaceAccess, WorkspaceContextService } from "@/modules/workspaces";
import prisma from "@/lib/prisma";
import { GymSettingsClient } from "./settings-client";

export const metadata = {
  title: "Configurações, Titularidade & LGPD | AtlasFit Gym",
  description: "Gestão do workspace, transferência segura de propriedade e governança de dados e privacidade",
};

export default async function GymSettingsPage() {
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
    anyCapability: ["workspace.manage"],
  });

  if (context.workspaceType !== "GYM") {
    redirect("/dashboard");
  }

  // 1. Dados cadastrais do workspace
  const workspace = await prisma.workspace.findUnique({
    where: { id: context.workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      createdAt: true,
      slogan: true,
      primaryColor: true,
      logoUrl: true,
      logoKey: true,
      watermarkUrl: true,
      watermarkKey: true,
      workoutCoverUrl: true,
      workoutCoverKey: true,
    },
  });

  if (!workspace) {
    redirect("/dashboard");
  }

  // 2. Membros elegíveis para sucessão / transferência de OWNER
  const eligibleStaffMembers = await getGymOwnershipCandidates(context.workspaceId, context.userId);

  const isCurrentOwner = workspace.ownerId === context.userId;
  const privacySubjects = context.hasCapability("privacy.manage") ? await prisma.workspaceMember.findMany({ where: { workspaceId: context.workspaceId }, select: { userId: true, user: { select: { name: true } } }, take: 100, orderBy: { user: { name: "asc" } } }) : [];

  return (
    <GymSettingsClient
      workspace={workspace}
      isCurrentOwner={isCurrentOwner}
      currentUserId={context.userId}
      privacySubjects={privacySubjects.map(member => ({ userId: member.userId, name: member.user.name || "Titular" }))}
      eligibleStaffMembers={eligibleStaffMembers}
      recentRequests={[]}
    />
  );
}
