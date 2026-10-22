import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { PersonalSidebar } from "@/components/application/personal-sidebar";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PersonalMobileNavbar } from "@/components/application/personal-mobile-navbar";
import { PersonalHeaderWorkspace } from "@/components/application/personal-header-workspace";
import { PersonalCoinsBadge } from "@/components/application/personal-coins-badge";
import { NotificationBell } from "@/components/application/notification-bell";
import { ChatHeaderButton } from "@/components/application/chat-header-button";
import { TopBannerCarousel } from "@/components/application/top-banner-carousel";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { requirePersonalWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { WorkspaceInitializer } from "@/components/application/workspace-initializer";
import { isPersonalTrialActive } from "@/modules/workspaces/domain/personal-trial";
import { headers } from "next/headers";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { assertGymPersonalAffiliation, isPersonalSubscriptionActive } from "@/modules/workspaces/application/personal-affiliation";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { PlatformBillingTopBanner } from "@/components/application/platform-billing-top-banner";

export default async function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Guard: unauthenticated or wrong GlobalRole → trainer login
  if (!session?.user) {
    redirect("/auth/trainer");
  }

  const role = (session.user as any).role as string | undefined;

  // Guard: if trainer is not onboarded, redirect to personal onboarding flow
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, isTestAccount: true }
  });


  const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (context.status !== "RESOLVED" || !context.workspaceId) redirect("/select-workspace");
  const defaultRoute = context.defaultRoute || "/select-workspace";
  const academy = context.workspaceType === "GYM";
  if (defaultRoute.startsWith("/student/")) redirect(defaultRoute);
  if (academy) {
    try {
      await requireGymWorkspaceAccess({ workspaceId: context.workspaceId });
      await assertGymPersonalAffiliation(context.workspaceId, session.user.id);
    } catch (error) { if (error instanceof WorkspaceAccessError) redirect("/select-workspace"); throw error; }
    if (!["/personal/academy", "/personal/chat"].includes((await headers()).get("x-atlasfit-path") || "")) redirect("/personal/academy");
  } else {
    await requirePersonalWorkspaceAccess({ workspaceId: context.workspaceId, allowedRoles: ["OWNER", "TRAINER", "ASSISTANT", "MANAGER"] });
    if (user && !user.onboarded && role === "TRAINER") redirect("/personal-onboarding");
  }
  const workspace = await prisma.workspace.findUnique({ where: { id: context.workspaceId }, select: { id: true, name: true, slug: true, type: true, ownerId: true, logoUrl: true, primaryColor: true, slogan: true, watermarkUrl: true, workoutCoverUrl: true } });
  if (!workspace) redirect("/select-workspace");
  const owner = academy ? null : await prisma.user.findUnique({ where: { id: workspace.ownerId }, select: { isTestAccount: true, subscription: { include: { plan: true } }, freeTrial: true } });
  const subscription = owner?.subscription ?? null;
  const freeTrial = owner?.freeTrial ?? null;

  const isTrialActive = isPersonalTrialActive(freeTrial);
  const isSubscriptionActive = isPersonalSubscriptionActive(subscription);
  const isTestAccount = owner?.isTestAccount || false;

  if (!academy && !isTrialActive && !isSubscriptionActive && !isTestAccount) {
    redirect("/subscription-expired");
  }

  const showBillingWarning = subscription?.status.toLowerCase() === "past_due" || subscription?.status.toLowerCase() === "unpaid";

  return (
    <SidebarProvider>
      <WorkspaceInitializer workspace={{ ...workspace, roles: context.roles, defaultRoute: context.defaultRoute, logo: workspace.name.slice(0, 2).toUpperCase(), plan: academy ? "Academia" : subscription?.plan.name || "Free Trial" }} />
      <PersonalSidebar academy={academy} />
      <SidebarInset>
        <PlatformBillingTopBanner role="PERSONAL" />
        <header className="flex h-18 shrink-0 items-center justify-between border-b px-4 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="px-4 mx-4 hidden md:inline-flex" />
            <SidebarTrigger className="md:hidden" />
            <Separator orientation="vertical" className="hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mr-1">
                <span>Personal Trainer</span>
                <span className="text-muted-foreground/30">|</span>
              </div>
              <PersonalHeaderWorkspace />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!academy && <PersonalCoinsBadge />}
            <ChatHeaderButton />
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 min-w-0 overflow-x-hidden max-sm:pb-20">
          {!academy && <TopBannerCarousel role="PERSONAL" />}
          {children}
        </div>
        <PersonalMobileNavbar academy={academy} />
      </SidebarInset>
    </SidebarProvider>
  );
}
