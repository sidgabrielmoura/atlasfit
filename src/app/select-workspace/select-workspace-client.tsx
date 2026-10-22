"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  LogOut,
  Flame,
  Building2,
  Dumbbell,
  Loader2,
  MapPin,
  Lock,
  Ban,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { workspaceActions } from "@/stores/workspace.store";
import { selectActiveWorkspace } from "@/modules/workspaces/application/actions";
import { toast } from "sonner";

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  type: "PERSONAL" | "GYM";
  logo: string;
  logoUrl?: string | null;
  primaryColor: string;
  plan: string;
  roles: string[];
  unitsCount: number;
  defaultRoute: string;
  isSuspended?: boolean;
}

interface SelectWorkspaceClientProps {
  workspaces: WorkspaceItem[];
  preferredWorkspaceId?: string | null;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  userRole?: string;
  supportEmail?: string;
  supportWhatsApp?: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Titular / Dono",
  MANAGER: "Gerente",
  RECEPTIONIST: "Recepção",
  FINANCE: "Financeiro",
  TRAINER: "Treinador / Professor",
  ASSISTANT: "Assistente",
  STUDENT: "Aluno",
};

export default function SelectWorkspaceClient({
  workspaces,
  user,
  preferredWorkspaceId,
  userRole,
  supportWhatsApp = "",
}: SelectWorkspaceClientProps) {
  const router = useRouter();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  const attemptedAutomaticSelection = useRef(false);

  const activeWorkspaces = workspaces.filter((w) => !w.isSuspended);
  const suspendedWorkspaces = workspaces.filter((w) => w.isSuspended);
  const isTrainerOrOwner =
    userRole === "TRAINER" ||
    userRole === "OWNER" ||
    workspaces.some((w) => w.roles.includes("OWNER") || w.roles.includes("TRAINER") || w.roles.includes("MANAGER"));

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const handleLogout = async () => {
    workspaceActions.clear();
    await signOut({ callbackUrl: "/auth/student" });
  };

  const handleSelectWorkspace = async (workspace: WorkspaceItem) => {
    if (selectingId || workspace.isSuspended) return;

    setSelectingId(workspace.id);
    const toastId = toast.loading(`Acessando ${workspace.name}...`);

    try {
      const res = await selectActiveWorkspace(workspace.id);
      if (res?.error) {
        toast.error(res.error, { id: toastId });
        setSelectingId(null);
        return;
      }

      workspaceActions.setWorkspaces(workspaces);
      if (res.workspace) workspaceActions.setActiveWorkspace(res.workspace);

      toast.success("Workspace selecionado com sucesso!", { id: toastId });
      router.push(res.defaultRoute || workspace.defaultRoute || "/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Erro ao selecionar workspace:", err);
      toast.error("Ocorreu um erro ao selecionar o workspace. Tente novamente.", { id: toastId });
      setSelectingId(null);
    }
  };

  useEffect(() => {
    const preferred = activeWorkspaces.find((workspace) => workspace.id === preferredWorkspaceId);
    if (preferred && !attemptedAutomaticSelection.current) {
      attemptedAutomaticSelection.current = true;
      void handleSelectWorkspace(preferred);
      return;
    }

    if (activeWorkspaces.length === 1 && suspendedWorkspaces.length === 0 && !attemptedAutomaticSelection.current) {
      attemptedAutomaticSelection.current = true;
      void handleSelectWorkspace(activeWorkspaces[0]);
    }
  }, [workspaces, preferredWorkspaceId]);

  const targetSuspended = suspendedWorkspaces[0];
  const workspaceName = targetSuspended?.name || "AtlasFit";
  const whatsappMessage = `Olá! Meu workspace (${workspaceName}) foi suspenso e gostaria de solicitar informações e suporte para regularizar o acesso. (E-mail: ${user.email || ""})`;

  const cleanPhone = (supportWhatsApp || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone
    ? cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`
    : "";

  const supportWhatsAppUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 md:p-12 font-sans select-none">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between border-b border-border/60 pb-6">
        <Image
          src="/logos_atlasfit/atlasfit (4).png"
          alt="AtlasFit Logo"
          width={130}
          height={38}
          priority
          className="object-contain"
        />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border/60 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-primary shrink-0" />
          AtlasFit Cloud
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl mx-auto my-auto py-10">
        {/* Cenário A: Personal com workspace suspenso e SEM outros workspaces ativos */}
        {isTrainerOrOwner && activeWorkspaces.length === 0 && suspendedWorkspaces.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <Card className="border border-border/80 bg-card/60 shadow-xs rounded-2xl">
              <CardContent className="p-8 text-center space-y-5">
                <div className="size-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <AlertCircle className="size-5" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Seu workspace foi suspenso
                  </h2>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {targetSuspended?.name}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    O acesso a este workspace está temporariamente suspenso. Entre em contato com nosso suporte via WhatsApp para regularizar o acesso.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    asChild
                    className="w-full h-11 rounded-xl font-semibold text-xs tracking-wide gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-colors"
                  >
                    <a href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-4" />
                      Entrar em contato via WhatsApp
                    </a>
                  </Button>

                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full h-9 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <LogOut className="size-3.5 mr-1.5" />
                    Sair da conta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : workspaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center py-12 px-6 max-w-md mx-auto border border-dashed border-border/60 bg-card/40 rounded-2xl space-y-5"
          >
            <div className="size-10 mx-auto rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <Flame className="size-5 opacity-50" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold">Nenhum workspace vinculado</h3>
              <p className="text-xs text-muted-foreground">
                Sua conta ainda não está associada a nenhum workspace ativo.
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
              Entrar com outra conta
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Título e Subtítulo limpos */}
            <div className="space-y-1 text-left">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Selecione o Workspace
              </h1>
              <p className="text-xs text-muted-foreground">
                Escolha o espaço em que deseja operar neste momento.
              </p>
            </div>

            {/* Aviso minimalista para personal quando possui workspaces suspensos e outros ativos */}
            {isTrainerOrOwner && suspendedWorkspaces.length > 0 && activeWorkspaces.length > 0 && (
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <AlertCircle className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">
                      Seu workspace foi suspenso
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {suspendedWorkspaces.map((w) => w.name).join(", ")}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shrink-0 cursor-pointer"
                >
                  <a href={supportWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-3.5" />
                    Falar no WhatsApp
                  </a>
                </Button>
              </div>
            )}

            {/* Aviso minimalista para aluno quando seu único workspace está suspenso */}
            {!isTrainerOrOwner && activeWorkspaces.length === 0 && suspendedWorkspaces.length > 0 && (
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex items-center gap-3 text-left">
                <div className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Lock className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Acesso indisponível</p>
                  <p className="text-[11px] text-muted-foreground">
                    O workspace do seu treinador ou academia está temporariamente suspenso. Fale com o seu responsável.
                  </p>
                </div>
              </div>
            )}

            {/* Grid minimalista de Workspaces */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace, index) => {
                const isSelected = selectingId === workspace.id;
                const isGym = workspace.type === "GYM";
                const isSuspended = Boolean(workspace.isSuspended);

                return (
                  <div
                    key={workspace.id}
                    role="button"
                    tabIndex={isSuspended || !ready || selectingId ? -1 : 0}
                    aria-label={`Acessar ${workspace.name}`}
                    aria-disabled={isSuspended || !ready || Boolean(selectingId)}
                    onKeyDown={(event) => {
                      if (!isSuspended && (event.key === "Enter" || event.key === " ") && ready && !selectingId) {
                        event.preventDefault();
                        void handleSelectWorkspace(workspace);
                      }
                    }}
                    onClick={() => !isSuspended && ready && !selectingId && handleSelectWorkspace(workspace)}
                    className={`h-full transition-all ${
                      isSuspended
                        ? "cursor-not-allowed select-none"
                        : selectingId && !isSelected
                        ? "opacity-50 pointer-events-none"
                        : "cursor-pointer"
                    }`}
                  >
                    <Card
                      className={`h-full transition-all duration-200 group overflow-hidden flex flex-col ${
                        isSuspended
                          ? "opacity-45 grayscale bg-muted/20 border-dashed border-border/80"
                          : `border-border/70 bg-card/60 hover:border-primary/50 hover:bg-card/90 shadow-xs ${
                              isSelected ? "border-primary ring-1 ring-primary/20" : ""
                            }`
                      }`}
                    >
                      <CardContent className="p-5 flex flex-col gap-3.5 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="flex aspect-square size-12 items-center justify-center rounded-xl text-white font-bold text-base shadow-xs overflow-hidden shrink-0"
                            style={{ backgroundColor: isSuspended ? "#64748b" : workspace.primaryColor }}
                          >
                            {workspace.logoUrl ? (
                              <img src={workspace.logoUrl} alt={workspace.name} className="size-full object-cover" />
                            ) : (
                              workspace.logo
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {isSuspended ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 bg-destructive/10 text-destructive border-destructive/20"
                              >
                                <Ban className="size-2.5" /> Suspenso
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 bg-secondary text-secondary-foreground border-border/60"
                              >
                                {isGym ? (
                                  <>
                                    <Building2 className="size-2.5" /> Academia
                                  </>
                                ) : (
                                  <>
                                    <Dumbbell className="size-2.5" /> Personal
                                  </>
                                )}
                              </Badge>
                            )}

                            {isGym && workspace.unitsCount > 0 && !isSuspended && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-medium">
                                <MapPin className="size-2.5" /> {workspace.unitsCount} {workspace.unitsCount === 1 ? "unidade" : "unidades"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <p
                            className={`font-semibold text-sm truncate transition-colors ${
                              isSuspended ? "text-muted-foreground" : "group-hover:text-primary text-foreground"
                            }`}
                          >
                            {workspace.name}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {workspace.roles.map((role) => (
                              <span
                                key={role}
                                className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded"
                              >
                                {ROLE_LABELS[role] || role}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="text-[10px] font-medium truncate max-w-[140px]">
                            {isSuspended ? "Indisponível" : workspace.plan}
                          </span>

                          <div className="flex items-center gap-1 font-semibold text-xs">
                            {isSuspended ? (
                              <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
                                <Lock className="size-3" /> Bloqueado
                              </span>
                            ) : isSelected ? (
                              <span className="text-primary flex items-center gap-1 text-[11px] font-semibold">
                                <Loader2 className="size-3 animate-spin" /> Entrando...
                              </span>
                            ) : (
                              <span className="text-primary flex items-center gap-0.5 text-[11px] font-semibold">
                                Acessar <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer minimalista */}
      <footer className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/60">
        <div className="flex items-center gap-3">
          <Avatar className="size-8 border border-border/60">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px] font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground leading-tight">{user.name || user.email}</p>
            <p className="text-[10px] text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive transition-colors gap-1.5 h-8 px-3 rounded-lg cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span>Sair da conta</span>
        </Button>
      </footer>
    </div>
  );
}
