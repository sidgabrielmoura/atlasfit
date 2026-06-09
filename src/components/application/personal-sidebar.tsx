"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  DollarSign,
  ClipboardList,
  CalendarDays,
  Settings,
  LogOut,
  Flame,
  QrCode,
  MessageSquare,
  BadgeCheck,
  UserPen,
  Copy,
  CheckCircle2,
  Download,
  Sun,
  Moon,
  ChevronRight,
  FolderOpen,
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { personalInfo } from "@/lib/mock-data";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { layoutStore } from "@/stores/layout";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";

const mainNavItems = [
  { title: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
  { title: "Alunos", href: "/personal/clients", icon: Users },
  { title: "Treinos e Exercícios", href: "/personal/workouts", icon: Dumbbell },
  { title: "Financeiro", href: "/personal/finance", icon: DollarSign },
  { title: "Arquivos", href: "/personal/files", icon: FolderOpen },
  { title: "Link de Captação", href: "#capture", icon: QrCode, isModal: true },
];

const manageNavItems = [
  { title: "Organização", href: "/personal/organization", icon: ClipboardList },
  { title: "Calendário", href: "/personal/calendar", icon: CalendarDays },
  { title: "Assinatura", href: "/personal/subscription", icon: BadgeCheck },
  { title: "Configurações", href: "/personal/settings", icon: Settings },
];

export function PersonalSidebar() {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const sidebarOpen = useSnapshot(layoutStore).isSidebarOpen;
  const workspaceSnap = useSnapshot(workspaceStore);
  const { data: session } = useSession();
  const user = session?.user;
  const [subInfo, setSubInfo] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/personal/subscription")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => setSubInfo(data.currentSubscription))
      .catch(() => {});
  }, []);

  const getInitials = (name?: string | null) => {
    if (!name) return "PT";
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const captureLink = `https://atlasfit.app/t/${workspaceSnap.activeWorkspace?.slug || (user?.name || personalInfo.name).toLowerCase()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(captureLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-3">
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarSeparator className="max-w-[90%] mx-auto" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

                if (item.isModal) {
                  return (
                    <Dialog key={item.title}>
                      <SidebarMenuItem>
                        <DialogTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className="hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </DialogTrigger>
                      </SidebarMenuItem>
                      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl gap-0">
                        <div className="px-6 pt-8 pb-4 text-center">
                          <DialogTitle className="text-2xl font-bold tracking-tight mb-2">Captação de Alunos</DialogTitle>
                          <DialogDescription className="text-[15px]">
                            Seu canal direto para novos alunos. Compartilhe o link ou mostre o QR Code abaixo.
                          </DialogDescription>
                        </div>

                        <div className="flex flex-col items-center px-6 pb-8 space-y-6">
                          <div className="relative p-[3px] rounded-3xl bg-linear-to-br from-primary via-primary/20 to-transparent">
                            <div className="bg-white p-5 rounded-[21px] flex flex-col items-center justify-center shadow-inner">
                              <QrCode className="size-44 text-black" strokeWidth={1.2} />
                            </div>
                          </div>

                          <Button variant="ghost" className="h-9 rounded-full text-xs px-4 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                            <Download className="size-3.5 mr-2" />
                            Baixar QR Code
                          </Button>

                          <div className="w-full space-y-1.5 pt-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1 uppercase tracking-wider">Seu link exclusivo</label>
                            <div className="flex w-full items-center p-1.5 bg-secondary/20 rounded-xl border border-border/50 transition-colors focus-within:border-primary/50 focus-within:bg-secondary/30">
                              <Input
                                readOnly
                                value={captureLink}
                                className="border-none bg-transparent shadow-none focus-visible:ring-0 text-foreground font-medium truncate px-3 h-10"
                              />
                              <Button
                                size="sm"
                                onClick={handleCopy}
                                className={cn(
                                  "shrink-0 h-10 px-5 rounded-lg font-semibold transition-all duration-300 shadow-none",
                                  copied
                                    ? "bg-success hover:bg-success/90 text-success-foreground"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                )}
                              >
                                {copied ? (
                                  <span className="flex items-center gap-2"><CheckCircle2 className="size-4" /> Copiado</span>
                                ) : (
                                  <span className="flex items-center gap-2"><Copy className="size-4" /> Copiar</span>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                }

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
          <SidebarGroupLabel>Gerenciar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manageNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
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
              <div className="relative flex items-center justify-center h-4 w-4 mr-2 overflow-hidden">
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
                  <Avatar size="default">
                    {user?.image && (
                      <AvatarImage src={user.image} alt={user.name || "Personal"} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 leading-none group-data-[collapsible=icon]:hidden items-start">
                    <span className="text-sm font-semibold truncate max-w-[130px]">{user?.name || "Personal Trainer"}</span>
                    {subInfo ? (
                      subInfo.status === "trial" ? (
                        <Badge variant="outline" className="text-[9px] h-4.5 font-bold px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20 py-0 uppercase select-none">
                          Teste: {subInfo.freeTrial?.daysRemaining ?? subInfo.daysRemaining}d
                        </Badge>
                      ) : subInfo.status === "active" ? (
                        <Badge variant="outline" className="text-[9px] h-4.5 font-bold px-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-0 uppercase select-none">
                          Premium: {subInfo.planName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-4.5 font-bold px-1.5 bg-red-500/10 text-red-500 border-red-500/20 py-0 uppercase select-none">
                          Inadimplente
                        </Badge>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">{user?.role === "TRAINER" ? "Personal Trainer" : "Usuário"}</span>
                    )}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/personal/settings" className="w-full flex items-center cursor-pointer">
                    <UserPen className="mr-2 size-4" />
                    Editar Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/personal/settings" className="w-full flex items-center cursor-pointer">
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
