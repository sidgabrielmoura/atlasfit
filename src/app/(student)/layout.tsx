import { StudentSidebar } from "@/components/application/student-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { StudentMobileNavbar } from "@/components/application/student-mobile-navbar";
import { NotificationBell } from "@/components/application/notification-bell";
import { ChatHeaderButton } from "@/components/application/chat-header-button";
import { WorkoutManager } from "@/components/application/WorkoutManager";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Guard: unauthenticated or wrong GlobalRole → student login
  if (!session?.user) {
    redirect("/auth/student");
  }

  const role = (session.user as any).role as string | undefined;
  if (role !== "STUDENT" && role !== "SUPERADMIN" && !(session.user as any).isImpersonated) {
    redirect("/auth/student");
  }

  // Se for superadmin ou sessão impersonada, ignora para permitir suporte e testes
  if (session?.user?.role !== "SUPERADMIN" && !(session?.user as any)?.isImpersonated) {
    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: "maintenance_mode" }
    });

    if (maintenanceSetting?.value === "true") {
      redirect("/maintenance");
    }
  }

  // Guard: if user is not onboarded, redirect to onboarding flow
  if (session?.user?.role !== "SUPERADMIN" && !(session?.user as any)?.isImpersonated) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboarded: true }
    });

    if (user && !user.onboarded) {
      redirect("/student-onboarding");
    }
  }

  // Fetch active workspace details for mobile header branding
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("student_active_workspace_id")?.value;

  let activeWorkspace = null;
  if (activeWorkspaceId) {
    activeWorkspace = await prisma.workspace.findUnique({
      where: { id: activeWorkspaceId, isActive: true },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        slogan: true,
      }
    });
  } else {
    const activeMember = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, role: "STUDENT", isActive: true },
      include: { workspace: true }
    });
    if (activeMember?.workspace) {
      activeWorkspace = activeMember.workspace;
    }
  }

  return (
    <SidebarProvider>
      <StudentSidebar />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1 hidden md:inline-flex" />

            {activeWorkspace && (
              <div className="flex items-center gap-2 md:hidden">
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-lg text-white font-bold text-xs shrink-0 overflow-hidden shadow-sm border border-white/[0.06]"
                  style={{
                    backgroundColor: activeWorkspace.primaryColor || "var(--primary)",
                  }}
                >
                  {activeWorkspace.logoUrl ? (
                    <img
                      src={activeWorkspace.logoUrl}
                      alt={activeWorkspace.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span>{activeWorkspace.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black tracking-tight text-foreground leading-none truncate max-w-[150px]">
                    {activeWorkspace.name}
                  </span>
                  <span
                    className="text-[8px] font-black uppercase tracking-wider leading-none mt-0.5 truncate max-w-[150px]"
                    style={{ color: activeWorkspace.primaryColor || "var(--primary)" }}
                  >
                    {activeWorkspace.slogan || "Assessoria Esportiva"}
                  </span>
                </div>
              </div>
            )}

            <div className="hidden md:flex relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar treinos, exercícios..."
                className="pl-9 bg-secondary/30 border-none h-9 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ChatHeaderButton />
            <NotificationBell />
          </div>
        </header>

        <main className="flex flex-col max-w-7xl mx-auto w-full pb-24 md:pb-6">
          {children}
        </main>
        <StudentMobileNavbar />
        <WorkoutManager />
      </SidebarInset>
    </SidebarProvider>
  );
}
