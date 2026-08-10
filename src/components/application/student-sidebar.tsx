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

export interface StudentNavItemDef {
  title: string;
  href: string;
  icon: any;
}

const overviewNavItems: StudentNavItemDef[] = [
  { title: "Início", href: "/student/dashboard", icon: LayoutDashboard },
  { title: "Chat com Personal", href: "/student/chat", icon: MessageSquare },
];

const trainingNavItems: StudentNavItemDef[] = [
  { title: "Meus Treinos", href: "/student/workouts", icon: Dumbbell },
  { title: "Evolução Corporal", href: "/student/evolution", icon: LineChart },
  { title: "Avaliações Físicas", href: "/student/assessments", icon: Activity },
  { title: "Agenda", href: "/student/agenda", icon: CalendarDays },
];

const financeNavItems: StudentNavItemDef[] = [
  { title: "Resumo Financeiro", href: "/student/finance", icon: DollarSign },
  { title: "Arquivos", href: "/student/files", icon: FolderOpen },
];

const preferencesNavItems: StudentNavItemDef[] = [
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

  const renderNavSection = (label: string, items: StudentNavItemDef[]) => (
    <SidebarGroup className="py-2">
      <SidebarGroupLabel className="px-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-1">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname?.startsWith(item.href + "/"));
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "h-9 px-4 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10! text-primary font-bold shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("size-4", isActive && "text-primary")} />
                    <span className="text-xs font-semibold">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

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
                          backgroundColor: activeWs.primaryColor || "var(--primary)",
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
                      document.cookie = `student_active_workspace_id=${ws.id}; path=/; max-age=31536000; SameSite=Lax`;
                      workspaceActions.setWorkspaces(workspaces);
                      workspaceActions.setActiveWorkspace(ws);
                      window.location.reload();
                    }}
                    className="gap-2 p-2 rounded-xl cursor-pointer"
                  >
                    <div
                      className="flex size-6 items-center justify-center rounded-md border text-[10px] font-bold text-white shrink-0 overflow-hidden"
                      style={{ backgroundColor: ws.primaryColor || "var(--primary)", borderColor: ws.primaryColor || "var(--primary)" }}
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
                    {ws.id === activeWs?.id && <Check className="size-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="max-w-[90%] mx-auto opacity-50" />

      <SidebarContent className="space-y-1 py-2">
        {renderNavSection("Painel Inicial", overviewNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Treinamento e Saúde", trainingNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Pagamentos e Anexos", financeNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Histórico e Preferências", preferencesNavItems)}
      </SidebarContent>

      <SidebarSeparator className="max-w-[90%] mx-auto opacity-50" />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Alternar Tema"
              className="rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all mb-2"
            >
              <div className="relative flex items-center justify-center size-4 overflow-hidden">
                <Sun className="absolute size-4 rotate-0 scale-100 transition-all duration-500 ease-in-out dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-500 ease-in-out dark:rotate-0 dark:scale-100 text-slate-300" />
              </div>
              {!sidebarOpen && (
                <span className="text-xs font-medium">{mounted ? (theme === "dark" ? "Modo Claro" : "Modo Escuro") : "Tema"}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-all px-3">
                  <Avatar className="size-8 rounded-xl border border-border/50">
                    <AvatarImage src={user?.image || undefined} alt={user?.name || "Aluno"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden ml-1 min-w-0">
                    <span className="text-sm font-bold tracking-tight truncate">{user?.name || "Aluno AtlasFit"}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold truncate">{user?.email || "aluno@atlasfit.app"}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-2xl shadow-xl border-border/50 p-2">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="size-9 rounded-xl">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{user?.name || "Aluno AtlasFit"}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{user?.email || "aluno@atlasfit.app"}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/student/settings" className="flex items-center gap-2">
                    <User className="size-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/auth/student" })}
                  className="rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center gap-2"
                >
                  <LogOut className="size-4" />
                  Sair da Conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
