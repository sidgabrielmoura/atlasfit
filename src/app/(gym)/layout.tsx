import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { WorkspaceContextService, requireWorkspaceAccess } from "@/modules/workspaces";
import { WorkspaceInitializer } from "@/components/application/workspace-initializer";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { GymSidebar } from "@/components/application/gym-sidebar";
import { GymMobileNavbar } from "@/components/application/gym-mobile-navbar";
import { PersonalHeaderWorkspace as WorkspaceHeader } from "@/components/application/personal-header-workspace";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/application/notification-bell";
import { TopBannerCarousel } from "@/components/application/top-banner-carousel";
import { PlatformBillingTopBanner } from "@/components/application/platform-billing-top-banner";


export default async function GymLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/gym");
  }

  // Verificar modo de manutenção
  if (session.user.role !== "SUPERADMIN" && !(session.user as any)?.isImpersonated) {
    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: "maintenance_mode" },
    });

    if (maintenanceSetting?.value === "true") {
      redirect("/maintenance");
    }
  }

  // Validação estrita de contexto de workspace no servidor
  const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);

  if (context.status === "NEEDS_SELECTION" || context.status === "NO_MEMBERSHIPS") {
    redirect("/select-workspace");
  }

  // Se o workspace ativo for do tipo PERSONAL, direciona para o ambiente correto
  if (context.workspaceType === "PERSONAL") {
    redirect("/personal/dashboard");
  }
  if (!context.workspaceId) redirect("/select-workspace");
  await requireWorkspaceAccess({ workspaceId: context.workspaceId });
  const workspace = await prisma.workspace.findUnique({ where: { id: context.workspaceId }, select: { id: true, name: true, slug: true, type: true, logoUrl: true, primaryColor: true, slogan: true, watermarkUrl: true, workoutCoverUrl: true } });
  if (!workspace) redirect("/select-workspace");


  return (
    <SidebarProvider>
      <WorkspaceInitializer workspace={{ ...workspace, roles: context.roles, defaultRoute: context.defaultRoute, logo: workspace.name.slice(0, 2).toUpperCase(), plan: "Academia" }} />
      <GymSidebar />
      <SidebarInset className="min-w-0">
        <PlatformBillingTopBanner role="GYM" />
        <header className="flex h-18 w-full shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="mx-4 hidden px-4 md:inline-flex" />
            <SidebarTrigger className="md:hidden" />
            <Separator orientation="vertical" className="hidden md:block" />
            <div className="flex min-w-0 items-center gap-3">
              <div className="mr-1 hidden items-center gap-2 text-sm text-muted-foreground md:flex">
                <span>Academia</span>
                <span className="text-muted-foreground/30">|</span>
              </div>
              <WorkspaceHeader />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
          </div>
        </header>
        <div className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
          <TopBannerCarousel role="ALL" />
          <div className="mx-auto w-full max-w-400 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </div>
        <GymMobileNavbar />
      </SidebarInset>
    </SidebarProvider>
  );
}
