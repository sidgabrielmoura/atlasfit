import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import prisma from "@/lib/prisma";
import { isPersonalSubscriptionActive, getDefaultAffiliatedGymId, hasActivePersonalExperience } from "@/modules/workspaces/application/personal-affiliation";
import { isPersonalTrialActive } from "@/modules/workspaces/domain/personal-trial";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/student");
  }

  const globalRole = session.user.role;

  // 1. SuperAdmin always routes to SuperAdmin console
  if (globalRole === "SUPERADMIN") {
    redirect("/superadmin/dashboard");
  }

  // 2. Resolve validated workspace context and default operational route
  const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);

  if (context.status === "RESOLVED" && context.defaultRoute) {
    if (context.workspaceType === "PERSONAL" && context.defaultRoute === "/personal/dashboard") {
      const workspace = await prisma.workspace.findUnique({ where: { id: context.workspaceId }, select: { ownerId: true } });
      const owner = workspace ? await prisma.user.findUnique({ where: { id: workspace.ownerId }, select: { isTestAccount: true, subscription: true, freeTrial: true } }) : null;
      if (owner && !owner.isTestAccount && !isPersonalSubscriptionActive(owner.subscription) && !isPersonalTrialActive(owner.freeTrial) && await getDefaultAffiliatedGymId(session.user.id)) {
        redirect("/select-workspace?academy=1");
      }
    }
    redirect(context.defaultRoute);
  }

  if (context.status === "NEEDS_SELECTION") {
    if (!await WorkspaceContextService.getActiveWorkspaceIdFromCookie() && !await hasActivePersonalExperience(session.user.id) && await getDefaultAffiliatedGymId(session.user.id)) redirect("/select-workspace?academy=1");
    redirect("/select-workspace");
  }
  if (context.status === "NO_MEMBERSHIPS") {
    const { default: prisma } = await import("@/lib/prisma");
    const guardian = await prisma.gymGuardian.findFirst({ where: { guardianUserId: session.user.id, revokedAt: null, verifiedAt: { not: null }, workspace: { type: "GYM", isActive: true }, studentMember: { isActive: true }, OR: [{ isLegalRepresentative: true }, { isFinancialResponsible: true }, { hasHealthAccess: true }] }, select: { id: true } });
    if (guardian) redirect("/guardian/dependents");
  }

  // 3. User with no active memberships
  if (globalRole === "TRAINER") {
    const hasAnyMembership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboarded: true },
    });
    if (!hasAnyMembership && !user?.onboarded) {
      redirect("/personal-onboarding");
    }
  }

  redirect("/select-workspace");
}
