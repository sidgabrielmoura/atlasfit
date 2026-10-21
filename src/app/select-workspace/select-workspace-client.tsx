"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Plus,
  LogOut,
  Flame,
  Building2,
  Dumbbell,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  MapPin,
  Lock,
  Ban,
  HelpCircle,
  AlertTriangle,
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

export default function SelectWorkspaceClient({ workspaces, user, preferredWorkspaceId, userRole, supportEmail = "suporte@atlasfit.app" }: SelectWorkspaceClientProps) {
  const router = useRouter();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const attemptedAutomaticSelection = useRef(false);

  const activeWorkspaces = workspaces.filter(w => !w.isSuspended);
  const suspendedWorkspaces = workspaces.filter(w => w.isSuspended);
  const isTrainerOrOwner = userRole === "TRAINER" || workspaces.some(w => w.roles.includes("OWNER") || w.roles.includes("TRAINER"));

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

      // Update local Valtio store
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
    // ONLY auto-select if there is an active preferred workspace or exactly 1 active workspace and NO suspended workspaces
    const preferred = activeWorkspaces.find(workspace => workspace.id === preferredWorkspaceId);
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

  const supportMailtoUrl = `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(
    `Workspace Suspenso: ${suspendedWorkspaces[0]?.name || "Suporte AtlasFit"}`
  )}&body=${encodeURIComponent(
    `Olá equipe de suporte,\n\nMeu workspace (${suspendedWorkspaces[0]?.name || ""}) está suspenso e gostaria de solicitar informações e instruções para regularizar o acesso.\n\nE-mail da conta: ${user.email || ""}`
  )}`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-5xl px-4 md:px-6 py-12 relative z-10">
        <div className="text-center space-y-6 mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center"
          >
            <Image
              src="/logos_atlasfit/atlasfit (4).png"
              alt="AtlasFit Logo"
              width={180}
              height={60}
              priority
              className="object-contain"
            />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Bem-vindo, <span className="text-primary">{user.name?.split(" ")[0] || "Usuário"}</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Selecione em qual espaço ou academia você deseja operar neste momento.
            </p>
          </div>
        </div>

        {/* Cenário A: Personal com workspace suspenso e SEM outros workspaces ativos */}
        {isTrainerOrOwner && activeWorkspaces.length === 0 && suspendedWorkspaces.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-6 max-w-lg mx-auto border border-rose-500/30 bg-card/60 backdrop-blur-md rounded-3xl shadow-xl shadow-rose-500/5 space-y-6"
          >
            <div className="p-4 size-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-inner">
              <ShieldAlert className="size-10" />
            </div>
            <div className="space-y-3">
              <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 font-bold uppercase text-[11px] px-3 py-1 rounded-full">
                Workspace Suspenso
              </Badge>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                Seu workspace foi suspenso
              </h2>
              <p className="text-sm font-bold text-primary">
                {suspendedWorkspaces[0]?.name}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                O acesso a este workspace foi temporariamente suspenso pela administração da plataforma.
                Para regularizar a situação e restabelecer o acesso completo aos seus alunos, treinos e dados, entre em contato com nossa equipe de suporte.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="h-12 px-6 rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 w-full sm:w-auto">
                <a href={supportMailtoUrl}>
                  <HelpCircle className="size-4" /> Entrar em contato com o suporte
                </a>
              </Button>
              <Button onClick={handleLogout} variant="outline" className="h-12 px-6 rounded-xl font-bold gap-2 w-full sm:w-auto">
                <LogOut className="size-4" /> Sair da conta
              </Button>
            </div>
          </motion.div>
        ) : workspaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-6 max-w-md mx-auto border border-dashed border-border/50 bg-card/30 backdrop-blur-sm rounded-2xl space-y-6"
          >
            <div className="p-4 size-16 mx-auto rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <Flame className="size-8 opacity-40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Nenhum workspace vinculado</h3>
              <p className="text-sm text-muted-foreground">
                Sua conta ainda não está associada a nenhuma assessoria ou academia ativa. Entre em contato com seu gestor ou treinador.
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Entrar com outra conta
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Aviso superior para personal quando possui workspaces suspensos e outros ativos */}
            {isTrainerOrOwner && suspendedWorkspaces.length > 0 && activeWorkspaces.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                    <ShieldAlert className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">Seu workspace foi suspenso</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O workspace <strong>"{suspendedWorkspaces.map(w => w.name).join(", ")}"</strong> foi temporariamente suspenso pela administração. Seus outros workspaces continuam disponíveis abaixo.
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl font-bold gap-1.5 shrink-0">
                  <a href={supportMailtoUrl}>
                    <HelpCircle className="size-3.5" /> Falar com o suporte
                  </a>
                </Button>
              </motion.div>
            )}

            {/* Aviso para aluno quando seu único workspace está suspenso */}
            {!isTrainerOrOwner && activeWorkspaces.length === 0 && suspendedWorkspaces.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm flex items-center gap-3 mb-4"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">Acesso temporariamente bloqueado</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O workspace do seu treinador/academia está temporariamente suspenso. Procure o responsável pelo seu acompanhamento para regularização.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workspaces.map((workspace, index) => {
                const isSelected = selectingId === workspace.id;
                const isGym = workspace.type === "GYM";
                const isSuspended = Boolean(workspace.isSuspended);

                return (
                  <motion.div
                    key={workspace.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div
                      role="button"
                      tabIndex={isSuspended || !ready || selectingId ? -1 : 0}
                      aria-label={`Acessar ${workspace.name}`}
                      aria-disabled={isSuspended || !ready || Boolean(selectingId)}
                      onKeyDown={event => {
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
                          ? "opacity-50 pointer-events-none cursor-pointer"
                          : "cursor-pointer"
                      }`}
                    >
                      <Card className={`h-full transition-all duration-300 group overflow-hidden flex flex-col ${
                        isSuspended
                          ? "opacity-45 grayscale bg-muted/20 border-dashed border-border/80"
                          : `border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                              isSelected ? "border-primary ring-2 ring-primary/20" : ""
                            }`
                      }`}>
                        <CardContent className="p-6 flex flex-col gap-4 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={`flex aspect-square size-14 items-center justify-center rounded-2xl text-white font-bold text-xl shadow-md transition-transform duration-300 overflow-hidden shrink-0 ${
                                isSuspended ? "" : "group-hover:scale-105"
                              }`}
                              style={{ backgroundColor: isSuspended ? "#64748b" : workspace.primaryColor }}
                            >
                              {workspace.logoUrl ? (
                                <img
                                  src={workspace.logoUrl}
                                  alt={workspace.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                workspace.logo
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {isSuspended ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                >
                                  <Ban className="size-3" /> Suspenso
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    isGym
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  }`}
                                >
                                  {isGym ? (
                                    <>
                                      <Building2 className="size-3" /> Academia
                                    </>
                                  ) : (
                                    <>
                                      <Dumbbell className="size-3" /> Personal
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

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <p className={`font-bold text-lg truncate transition-colors ${isSuspended ? "text-muted-foreground" : "group-hover:text-primary"}`}>
                              {workspace.name}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {workspace.roles.map((role) => (
                                <span
                                  key={role}
                                  className="text-[10px] font-semibold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md"
                                >
                                  {ROLE_LABELS[role] || role}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium text-[11px] truncate max-w-[150px]">
                              {isSuspended ? "Indisponível" : workspace.plan}
                            </span>

                            <div className="flex items-center gap-1 font-semibold text-xs">
                              {isSuspended ? (
                                <span className="text-rose-500 flex items-center gap-1 font-bold">
                                  <Lock className="size-3" /> Bloqueado
                                </span>
                              ) : isSelected ? (
                                <span className="text-primary flex items-center gap-1 font-semibold">
                                  <Loader2 className="size-3.5 animate-spin" /> Entrando...
                                </span>
                              ) : (
                                <span className="text-primary flex items-center gap-1 font-semibold">
                                  Acessar <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 mt-10 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border border-border/50">
              <AvatarImage src={user.image || ""} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold">{user.email}</p>
              <p className="text-xs text-muted-foreground">Conta Global AtlasFit</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-muted-foreground hover:text-destructive transition-colors gap-2"
          >
            <LogOut className="size-4" />
            <span>Sair da conta</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
