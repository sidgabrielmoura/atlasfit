"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  Building2,
  DollarSign,
  Dumbbell,
  BadgeCheck,
  ShieldAlert,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Globe,
  Database,
  Search,
  Folder,
  Megaphone,
} from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { layoutStore } from "@/stores/layout";
import { useSnapshot } from "valtio";

const superAdminNavItems = [
  { title: "Dashboard Global", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { title: "Usuários", href: "/superadmin/users", icon: Users },
  { title: "Workspaces", href: "/superadmin/workspaces", icon: Building2 },
  { title: "Financeiro", href: "/superadmin/finance", icon: DollarSign },
];

const platformNavItems = [
  { title: "Exercícios", href: "/superadmin/exercises", icon: Dumbbell },
  { title: "Arquivos & Documentos", href: "/superadmin/files", icon: Folder },
  { title: "Assinaturas", href: "/superadmin/subscriptions", icon: BadgeCheck },
  { title: "Campanhas e Avisos", href: "/superadmin/campaigns", icon: Megaphone },
  { title: "Logs & Auditoria", href: "/superadmin/logs", icon: Database },
  { title: "Configurações", href: "/superadmin/settings", icon: Settings },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const sidebarOpen = useSnapshot(layoutStore).isSidebarOpen;
  const [mounted, setMounted] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="px-6 py-5">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <ShieldAlert className="size-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">AtlasFit Admin</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">SuperAdmin Access</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="max-w-[85%] mx-auto opacity-50" />

      <SidebarContent className="">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Visão Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {superAdminNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-10 px-4 rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/10! text-primary font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("size-4", isActive && "text-primary")} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "h-10 px-4 rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/10! text-primary font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("size-4", isActive && "text-primary")} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Alternar Tema"
              className=" rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all mb-2"
            >
              <div className="relative flex items-center justify-center size-4 overflow-hidden">
                <Sun className="absolute size-4 rotate-0 scale-100 transition-all duration-500 ease-in-out dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-500 ease-in-out dark:rotate-0 dark:scale-100 text-slate-300" />
              </div>
              {!sidebarOpen && (
                <span className="text-sm font-medium">{mounted ? (theme === "dark" ? "Modo Claro" : "Modo Escuro") : "Tema"}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-all px-3">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold rounded-lg">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden ml-1">
                    <span className="text-sm font-bold tracking-tight">Super Admin</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Master Root</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-xl shadow-xl border-border/50">
                <DropdownMenuItem className="h-10 rounded-lg cursor-pointer">
                  <Globe className="mr-2 size-4" />
                  Site Público
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="h-10 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 size-4" />
                  Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
