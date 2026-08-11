"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  QrCode,
  MessageSquare,
  BadgeCheck,
  UserPen,
  Copy,
  CheckCircle2,
  Download,
  Sun,
  Moon,
  FolderOpen,
  Target,
  ClipboardCheck,
  Megaphone,
  Gift,
  Wallet,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toDataURL as generateQrCode } from 'qrcode'
import Image from "next/image";

export interface NavItemDef {
  title: string;
  href: string;
  icon: any;
  isHighlight?: boolean;
  isModal?: boolean;
}

const overviewNavItems: NavItemDef[] = [
  { title: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
  { title: "Link de Captação", href: "#capture", icon: QrCode, isModal: true },
];

const clientsNavItems: NavItemDef[] = [
  { title: "Alunos", href: "/personal/clients", icon: Users },
  { title: "Funil CRM", href: "/personal/crm", icon: Target },
  { title: "Mensagens", href: "/personal/chat", icon: MessageSquare },
];

const prescriptionNavItems: NavItemDef[] = [
  { title: "Treinos e Exercícios", href: "/personal/workouts", icon: Dumbbell },
  { title: "Avaliações Físicas", href: "/personal/assessments", icon: ClipboardCheck },
  { title: "Arquivos e Anexos", href: "/personal/files", icon: FolderOpen },
];

const financeNavItems: NavItemDef[] = [
  { title: "Resumo Financeiro", href: "/personal/finance", icon: DollarSign },
  { title: "Carteira Atlas Pay", href: "/personal/wallet", icon: Wallet },
];

const growthNavItems: NavItemDef[] = [
  { title: "Atlas Engage", href: "/personal/engage", icon: Megaphone },
  { title: "Indique e Ganhe", href: "/personal/rewards", icon: Gift, isHighlight: true },
];

const systemNavItems: NavItemDef[] = [
  { title: "Organização", href: "/personal/organization", icon: ClipboardList },
  { title: "Calendário", href: "/personal/calendar", icon: CalendarDays },
  { title: "Minha Assinatura", href: "/personal/subscription", icon: BadgeCheck },
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
  const { isMobile, setOpenMobile } = useSidebar();
  const [qrcodeImage, setQrcodeImage] = useState<string | null>(null)
  const clickDownloadQrcode = useRef<HTMLAnchorElement>(null);

  const primaryHex = workspaceSnap.activeWorkspace?.primaryColor || "#3052EB";
  const hexToRgb = (hex: string) => {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return { r: 48, g: 82, b: 235 };
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  };
  const rgb = hexToRgb(primaryHex);
  const darkenRgb = { r: Math.max(rgb.r - 40, 0), g: Math.max(rgb.g - 40, 0), b: Math.max(rgb.b - 40, 0) };
  const highlightGradient = `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.95) 0%, rgba(${darkenRgb.r},${darkenRgb.g},${darkenRgb.b},0.85) 100%)`;
  const highlightShadow = `0 8px 32px 0 rgba(${rgb.r},${rgb.g},${rgb.b},0.35), 0 2px 8px 0 rgba(0,0,0,0.25)`;
  const highlightGlowStyle = {
    background: highlightGradient,
    boxShadow: highlightShadow,
    color: "white",
  };
  const highlightActiveStyle = {
    background: highlightGradient,
    boxShadow: `0 8px 32px 0 rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`,
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
  };

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/personal/subscription")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => setSubInfo(data.currentSubscription))
      .catch(() => { });
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

  const captureLink = `https://${subInfo?.primaryDomain || "atlasfit.app"}/t/${workspaceSnap.activeWorkspace?.slug || (user?.name || personalInfo.name).toLowerCase()}`;

  const generateQrcode = async () => {
    const qrcode = await generateQrCode(captureLink, { errorCorrectionLevel: 'H', type: 'image/png', color: { light: "#fff", dark: "#000" } })
    setQrcodeImage(qrcode)
  }

  useEffect(() => {
    if (captureLink) generateQrcode()
  }, [captureLink])

  const handleCopy = () => {
    navigator.clipboard.writeText(captureLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderNavSection = (label: string, items: NavItemDef[]) => (
    <SidebarGroup className="py-2">
      <SidebarGroupLabel className="px-4 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-1">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "#capture" && pathname?.startsWith(item.href + "/"));

            if (item.isModal) {
              return (
                <Dialog key={item.title}>
                  <SidebarMenuItem>
                    <DialogTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className="h-9 px-4 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                      >
                        <item.icon className="size-4" />
                        <span className="text-xs font-semibold">{item.title}</span>
                      </SidebarMenuButton>
                    </DialogTrigger>
                  </SidebarMenuItem>
                  <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl! gap-0">
                    <div className="px-6 pt-8 pb-4 text-center">
                      <DialogTitle className="text-2xl font-bold tracking-tight mb-2">Captação de Alunos</DialogTitle>
                      <DialogDescription className="text-[15px]">
                        Seu canal direto para novos alunos. Compartilhe o link ou mostre o QR Code abaixo.
                      </DialogDescription>
                    </div>

                    <div className="flex flex-col items-center px-6 pb-8 space-y-6">
                      {qrcodeImage && (
                        <div className="relative p-0.75 rounded-3xl bg-linear-to-br from-primary via-primary/20 to-transparent">
                          <div className="bg-white rounded-3xl flex flex-col items-center justify-center shadow-inner">
                            <img src={qrcodeImage} className="rounded-3xl size-60" />
                          </div>
                        </div>
                      )}

                      <Button onClick={() => clickDownloadQrcode.current?.click()} variant="ghost" className="h-9 rounded-full text-xs px-4 text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                        <Download className="size-3.5 mr-2" />
                        Baixar QR Code
                      </Button>

                      <a href={qrcodeImage!} download ref={clickDownloadQrcode}></a>

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
                    "h-9 px-4 rounded-xl transition-all duration-200",
                    isActive && !item.isHighlight && "bg-primary/10! text-primary font-bold shadow-xs",
                    !isActive && !item.isHighlight && "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    item.isHighlight && "relative overflow-hidden group font-bold transition-all"
                  )}
                  style={item.isHighlight ? (isActive ? highlightActiveStyle : highlightGlowStyle) : undefined}
                >
                  <Link href={item.href}>
                    {item.isHighlight && <div className="animate-apple-sweep" />}
                    <item.icon className={cn(
                      "size-4 z-10",
                      isActive && !item.isHighlight && "text-primary",
                      item.isHighlight && "text-white font-bold"
                    )} />
                    <span className={cn("text-xs font-semibold", item.isHighlight && "text-white font-bold z-10")}>{item.title}</span>
                    {item.isHighlight && (
                      <span className="relative flex h-1.5 w-1.5 ml-auto z-10">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
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

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-3">
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarSeparator className="max-w-[90%] mx-auto opacity-50" />

      <SidebarContent className="">
        {renderNavSection("Visão Geral", overviewNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Gestão de Clientes", clientsNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Prescrição e Avaliações", prescriptionNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Finanças e Atlas Pay", financeNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Engajamento e Crescimento", growthNavItems)}
        <SidebarSeparator className="max-w-[90%] mx-auto opacity-40" />

        {renderNavSection("Operação e Sistema", systemNavItems)}
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
                    <AvatarImage src={user?.image || (personalInfo as any).avatar} alt={user?.name || personalInfo.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {getInitials(user?.name || personalInfo.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden ml-1 min-w-0">
                    <span className="text-sm font-bold tracking-tight truncate">{user?.name || personalInfo.name}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold truncate">{user?.email || personalInfo.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 rounded-2xl shadow-xl border-border/50 p-2">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="size-9 rounded-xl">
                    <AvatarImage src={user?.image || (personalInfo as any).avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {getInitials(user?.name || personalInfo.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{user?.name || personalInfo.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{user?.email || personalInfo.email}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/personal/settings" className="flex items-center gap-2">
                    <UserPen className="size-4" />
                    Editar Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/personal/subscription" className="flex items-center gap-2">
                    <BadgeCheck className="size-4 text-amber-500" />
                    Minha Assinatura
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/auth/trainer" })}
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
