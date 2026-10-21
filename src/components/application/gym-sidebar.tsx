"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Dumbbell,
  DollarSign,
  Settings,
  Sun,
  Moon,
  LogOut,
  FileText,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { WorkspaceSwitcher } from "./workspace-switcher";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSnapshot } from "valtio";
import { cn } from "@/lib/utils";
import { workspaceStore, workspaceActions } from "@/stores/workspace.store";
import { useSession, signOut } from "next-auth/react";

interface NavItemDef {
  title: string;
  href: string;
  icon: any;
  badge?: string;
  requiresManagement?: boolean;
  requiresFinance?: boolean;
}

const operationNavItems: NavItemDef[] = [
  { title: "Visão Geral", href: "/gym/dashboard", icon: LayoutDashboard },
  { title: "Recepção Rápida", href: "/gym/reception", icon: UserCheck, badge: "Balcão" },
  { title: "Alunos", href: "/gym/students", icon: Users },
  { title: "Matrículas & Contratos", href: "/gym/enrollments", icon: FileText },
  { title: "Catálogo de Planos", href: "/gym/plans", icon: Layers },
  { title: "Treinos", href: "/gym/workouts", icon: Dumbbell },
];

const managementNavItems: NavItemDef[] = [
  { title: "Equipe", href: "/gym/staff", icon: Users, requiresManagement: true },
  { title: "Financeiro & Métricas", href: "/gym/finance", icon: DollarSign, requiresFinance: true },
  { title: "Revisão de contratos e saldos", href: "/gym/reconciliation", icon: FileText, requiresManagement: true },
  { title: "Importação Assistida", href: "/gym/import", icon: FileSpreadsheet, requiresManagement: true },
  { title: "Configurações", href: "/gym/settings", icon: Settings, requiresManagement: true },
];

export function GymSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const workspaceSnap = useSnapshot(workspaceStore);
  const { data: session } = useSession();
  const user = session?.user;
  const { isMobile, setOpenMobile } = useSidebar();


  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roles = (workspaceSnap.activeWorkspace?.roles as string[]) || [];
  const isReceptionOnly =
    roles.includes("RECEPTIONIST") &&
    !roles.some((r) => ["OWNER", "MANAGER", "FINANCE"].includes(r));
  const hasFinanceRole = roles.some((r) => ["OWNER", "MANAGER", "FINANCE"].includes(r));
  const hasManagementRole = roles.some((r) => ["OWNER", "MANAGER"].includes(r));

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "GY";

  const handleLogout = async () => {
    workspaceActions.clear();
    await signOut({ callbackUrl: "/auth/gym" });
  };

  const renderNavGroup = (title: string, items: NavItemDef[]) => {
    const filteredItems = items.filter((item) => {
      if (item.requiresManagement && !hasManagementRole && user?.role !== "SUPERADMIN") return false;
      if (item.requiresFinance && !hasFinanceRole && user?.role !== "SUPERADMIN") return false;
      return true;
    });

    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup className="py-2">
        <SidebarGroupLabel className="px-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-1">
          {title}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/gym/dashboard" && pathname.startsWith(item.href + "/"));

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    onClick={() => isMobile && setOpenMobile(false)}
                    className={cn(
                      "h-9 rounded-xl px-4 transition-all duration-200",
                      isActive ? "bg-primary/10! text-primary font-bold shadow-xs" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                      <item.icon className={cn("size-4 shrink-0", isActive && "text-primary")} />
                      <span className="truncate text-xs font-semibold">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[9px] group-data-[collapsible=icon]:hidden"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-3">
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarSeparator className="mx-auto max-w-[90%] opacity-50" />
      <SidebarContent>
        {renderNavGroup("Visão Geral", operationNavItems.slice(0, 2))}
        <SidebarSeparator className="mx-auto max-w-[90%] opacity-40" />
        {renderNavGroup("Gestão de Alunos", operationNavItems.slice(2))}
        {!isReceptionOnly && (
          <>
            <SidebarSeparator className="mx-auto max-w-[90%] opacity-40" />
            {renderNavGroup("Gestão e Sistema", managementNavItems)}
          </>
        )}
      </SidebarContent>
      <SidebarSeparator className="mx-auto max-w-[90%] opacity-50" />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Alternar Tema"
              className="mb-2 rounded-xl text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
            >
              {mounted && theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              <span className="text-xs font-medium">{mounted ? (theme === "dark" ? "Modo Claro" : "Modo Escuro") : "Tema"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="rounded-2xl bg-secondary/40 px-3 transition-all hover:bg-secondary/60">
                  <Avatar className="size-8 shrink-0 rounded-xl border border-border/50">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="ml-1 flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-bold tracking-tight">{user?.name || "Operador"}</span>
                    <span className="truncate text-[10px] font-semibold text-muted-foreground">{user?.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-2xl border-border/50 p-2 shadow-xl">
                <div className="flex min-w-0 flex-col gap-1 p-2">
                  <span className="truncate text-xs font-bold">{user?.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground">{user?.email}</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleLogout} className="flex cursor-pointer items-center gap-2 rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="size-4" /> Sair da Conta
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
