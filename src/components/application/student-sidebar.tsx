"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Dumbbell,
  LineChart,
  CalendarDays,
  Settings,
  LogOut,
  User,
  Activity,
  History,
  Sun,
  Moon,
  MessageSquare,
  DollarSign,
  FolderOpen,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useSnapshot } from "valtio";
import { workspaceStore, workspaceActions } from "@/stores/workspace.store";
import { getPersonalWorkspaces } from "@/components/application/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { layoutStore } from "@/stores/layout";

const mainNavItems = [
  { title: "Início", href: "/student/dashboard", icon: LayoutDashboard },
  { title: "Meus Treinos", href: "/student/workouts", icon: Dumbbell },
  { title: "Evolução", href: "/student/evolution", icon: LineChart },
  { title: "Avaliações Físicas", href: "/student/assessments", icon: Activity },
  { title: "Agenda", href: "/student/agenda", icon: CalendarDays },
  { title: "Financeiro", href: "/student/finance", icon: DollarSign },
  { title: "Arquivos", href: "/student/files", icon: FolderOpen },
];

const helpNavItems = [
  { title: "Histórico", href: "/student/history", icon: History },
  { title: "Feedbacks", href: "/student/feedbacks", icon: MessageSquare },
  { title: "Configurações", href: "/student/settings", icon: Settings },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;
  const sidebarOpen = useSnapshot(layoutStore).isSidebarOpen;
  const { data: session } = useSession();
  const user = session?.user;
  const { isMobile, setOpenMobile } = useSidebar();

  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  useEffect(() => {
    setMounted(true);
    async function loadWorkspaces() {
      try {
        const res = await getPersonalWorkspaces();
        setWorkspaces(res);
        
        // Auto-initialize active workspace in Valtio if not set
        if (res && res.length > 0) {
          workspaceActions.setWorkspaces(res);
          const cookieVal = document.cookie
            .split("; ")
            .find((row) => row.startsWith("student_active_workspace_id="))
            ?.split("=")[1];
            
          const active = res.find((w) => w.id === cookieVal) || res[0];
          workspaceActions.setActiveWorkspace(active);
          
          if (!cookieVal) {
            document.cookie = `student_active_workspace_id=${active.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar workspaces do aluno:", err);
      }
    }
    loadWorkspaces();
  }, []);

  const getInitials = (name?: string | null) => {
    if (!name) return "AL";
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                >
                  {activeWs ? (
                    <>
                      <div
                        className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground font-bold text-sm shrink-0 overflow-hidden"
                        style={{
                          backgroundColor: activeWs.primaryColor || "#0ea5e9",
                        }}
                      >
                        {activeWs.logoUrl ? (
                          <img
                            src={activeWs.logoUrl}
                            alt={activeWs.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span>{activeWs.logo || activeWs.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden min-w-0">
                        <span className="truncate font-semibold text-foreground">
                          {activeWs.name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                          {activeWs.slogan || "Assessoria Esportiva"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 p-1 rounded-xl animate-pulse w-full">
                      <div className="size-8 rounded-lg bg-neutral-400/20 shrink-0" />
                      <div className="flex-1 space-y-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className="h-3.5 w-20 bg-neutral-400/20 rounded" />
                        <div className="h-2 w-12 bg-neutral-400/20 rounded" />
                      </div>
                    </div>
                  )}
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-2"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-2.5 py-2">
                  Minhas Assessorias
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => {
                      if (ws.id === activeWs?.id) return;
                      // 1. Set cookie for backend layouts and APIs
                      document.cookie = `student_active_workspace_id=${ws.id}; path=/; max-age=31536000; SameSite=Lax`;
                      // 2. Set Valtio active workspace
                      workspaceActions.setWorkspaces(workspaces);
                      workspaceActions.setActiveWorkspace(ws);
                      // 3. Reload page to trigger dynamic Next.js Server Components and API hydration
                      window.location.reload();
                    }}
                    className="gap-2 p-2 rounded-xl cursor-pointer"
                  >
                    <div
                      className="flex size-6 items-center justify-center rounded-md border text-[10px] font-bold text-white shrink-0 overflow-hidden"
                      style={{ backgroundColor: ws.primaryColor || "#0ea5e9", borderColor: ws.primaryColor || "#0ea5e9" }}
                    >
                      {ws.logoUrl ? (
                        <img
                          src={ws.logoUrl}
                          alt={ws.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        ws.logo
                      )}
                    </div>
                    <span className="flex-1 truncate text-xs font-semibold">{ws.name}</span>
                    {activeWs?.id === ws.id && (
                      <Check className="size-4 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="max-w-[90%] mx-auto" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        isActive && "bg-primary/10! text-primary hover:bg-primary/10!",
                        "transition-all"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("size-4", isActive && "text-primary")} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="max-w-[90%] mx-auto" />

        <SidebarGroup>
          <SidebarGroupLabel>Apoio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        isActive && "bg-primary/10! text-primary",
                        "transition-all"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("size-4", isActive && "text-primary")} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="max-w-[90%] mx-auto" />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Alternar Tema"
              className="cursor-pointer mb-1 bg-neutral-400/10 hover:bg-primary/5"
            >
              <div className="relative flex items-center justify-center h-4 w-4 overflow-hidden">
                <Sun className="absolute size-4 rotate-0 scale-100 transition-all duration-500 ease-in-out dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-500 ease-in-out dark:rotate-0 dark:scale-100 text-slate-300" />
              </div>
              {!sidebarOpen && (
                <span>{mounted ? (theme === "dark" ? "Modo Claro" : "Modo Escuro") : "Tema"}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="cursor-pointer bg-neutral-400/10 hover:bg-primary/5">
                  <Avatar className="size-8">
                    {user?.image && (
                      <AvatarImage src={user.image} alt={user.name || "Aluno"} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-semibold truncate max-w-[130px]">{user?.name || "Aluno"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Aluno Elite</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/student/profile" className="cursor-pointer">
                    <User className="mr-2 size-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/student/settings" className="cursor-pointer">
                    <Settings className="mr-2 size-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
