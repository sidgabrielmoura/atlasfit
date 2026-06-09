"use client"

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Users,
  Dumbbell,
  DollarSign,
  Ban,
  Activity,
  CheckCircle2,
  Settings2,
  AlertCircle,
  LogIn,
  Loader2,
  MessageCircle,
  TrendingUp,
  Flame,
  CreditCard,
  Trash2,
  Sliders,
  Sparkles
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function StatSkeleton() {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkspaceDeepViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspending, setIsSuspending] = useState(false);

  // States para Impersonate de membros
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [memberToImpersonate, setMemberToImpersonate] = useState<any>(null);
  const [isImpersonateOpen, setIsImpersonateOpen] = useState(false);

  // States para Moderação Financeira
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [isDeletePaymentAlertOpen, setIsDeletePaymentAlertOpen] = useState(false);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch(`/api/superadmin/workspaces/${unwrappedParams.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWorkspace(data);
    } catch (error) {
      toast.error("Erro ao carregar os dados do workspace.");
      router.push("/superadmin/workspaces");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [unwrappedParams.id, router]);

  const handleToggleStatus = async () => {
    setIsSuspending(true);
    try {
      const newStatus = !workspace.isActive;
      const res = await fetch(`/api/superadmin/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (!res.ok) throw new Error("Erro na atualização");
      setWorkspace({ ...workspace, isActive: newStatus });
      toast.success(newStatus ? "Workspace reativado!" : "Workspace suspenso com segurança!");
    } catch (error) {
      toast.error("Erro ao alterar o status do workspace.");
    } finally {
      setIsSuspending(false);
    }
  };

  // Executa Impersonate
  const handleImpersonate = async () => {
    if (!memberToImpersonate) return;
    setIsImpersonating(true);
    const toastId = toast.loading("Gerando token de acesso...");
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: memberToImpersonate.userId })
      });
      if (!res.ok) throw new Error("Falha ao gerar token");
      const { token } = await res.json();

      toast.loading("Realizando login seguro...", { id: toastId });

      const result = await signIn("credentials", {
        impersonateToken: token,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Login realizado com sucesso!", { id: toastId });
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      toast.error("Erro ao tentar acessar a conta.", { id: toastId });
      setIsImpersonating(false);
    } finally {
      setIsImpersonateOpen(false);
      setMemberToImpersonate(null);
    }
  };

  // Abre Modal de Impersonate
  const triggerImpersonate = (member: any) => {
    setMemberToImpersonate(member);
    setIsImpersonateOpen(true);
  };

  // Abre Modal de Moderação Financeira
  const triggerModeratePayment = (payment: any) => {
    setSelectedPayment(payment);
    setIsPaymentModalOpen(true);
  };

  // Atualiza status de pagamento
  const handleUpdatePaymentStatus = async (newStatus: string) => {
    if (!selectedPayment) return;
    setUpdatingPaymentStatus(true);
    try {
      const res = await fetch(`/api/superadmin/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Erro ao atualizar pagamento");

      toast.success("Status de pagamento atualizado com sucesso!");
      setIsPaymentModalOpen(false);
      setSelectedPayment(null);
      await fetchWorkspace(); // Atualiza dados da tela
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
    } finally {
      setUpdatingPaymentStatus(false);
    }
  };

  // Confirma Exclusão de pagamento
  const handleDeletePaymentConfirm = async () => {
    if (!selectedPayment) return;
    setDeletingPayment(true);
    try {
      const res = await fetch(`/api/superadmin/payments/${selectedPayment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir pagamento");

      toast.success("Pagamento excluído definitivamente!");
      setIsDeletePaymentAlertOpen(false);
      setIsPaymentModalOpen(false);
      setSelectedPayment(null);
      await fetchWorkspace(); // Atualiza dados da tela
    } catch (error) {
      toast.error("Erro ao remover pagamento.");
    } finally {
      setDeletingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <Skeleton className="h-[450px] w-full rounded-xl" />
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-secondary/30 hover:bg-secondary">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">{workspace.name}</h1>
              {workspace.isActive ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold uppercase tracking-wider">Ativo</Badge>
              ) : (
                <Badge variant="destructive" className="font-bold uppercase tracking-wider">Suspenso</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm font-medium mt-1">/app/{workspace.slug}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={workspace.isActive ? "destructive" : "default"}
                className={cn(
                  "h-11 rounded-xl font-bold gap-2 shadow-lg cursor-pointer",
                  !workspace.isActive && "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
                )}
              >
                {workspace.isActive ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                {workspace.isActive ? "Suspender Workspace" : "Reativar Workspace"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border/50">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black text-xl flex items-center gap-2">
                  <AlertCircle className="size-5 text-destructive" />
                  Tem certeza?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                  {workspace.isActive
                    ? "Suspender este workspace impedirá que todos os personais e alunos vinculados a ele façam login ou acessem a plataforma. Essa ação pode ser desfeita depois."
                    : "Reativar este workspace liberará o acesso imediato de todos os usuários vinculados a ele."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-2">
                <AlertDialogCancel className="rounded-xl font-bold h-11">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleToggleStatus}
                  disabled={isSuspending}
                  className={cn(
                    "rounded-xl h-11 font-black cursor-pointer",
                    workspace.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {isSuspending ? "Aguarde..." : (workspace.isActive ? "Sim, Suspender" : "Sim, Reativar")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-6 space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alunos Ativos</p>
              <h3 className="text-2xl font-black tracking-tight">{workspace.studentsCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-6 space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MRR Estimado</p>
              <h3 className="text-2xl font-black tracking-tight">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(workspace.mrr || 0)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-6 space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-blue-500/10 text-blue-500">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Planos Cadastrados</p>
              <h3 className="text-2xl font-black tracking-tight">{workspace.plans?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-6 space-y-3">
            <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-500">
              <Dumbbell className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Treinos Gerados</p>
              <h3 className="text-2xl font-black tracking-tight">{workspace._count?.workouts || 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid grid-cols-3 max-w-md rounded-xl p-1 bg-secondary/30 h-11 border border-border/40 mb-8">
          <TabsTrigger value="geral" className="rounded-lg gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings2 className="size-3.5" /> Informações
          </TabsTrigger>
          <TabsTrigger value="membros" className="rounded-lg gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="size-3.5" /> Membros ({workspace.members?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="rounded-lg gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <DollarSign className="size-3.5" /> Controle Financeiro
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA GERAL */}
        <TabsContent value="geral" className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Workspace Info */}
            <Card className="border-border/40 shadow-sm bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Settings2 className="size-5 text-primary" /> Detalhes do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ID do Workspace</p>
                    <p className="font-semibold text-sm mt-1 font-mono">{workspace.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Data de Criação</p>
                    <p className="font-semibold text-sm mt-1">{new Date(workspace.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-6">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Proprietário (Owner)</h4>
                  {workspace.owner ? (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/10 group">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full bg-primary/20 text-primary font-black flex items-center justify-center shrink-0">
                          {workspace.owner.name?.substring(0, 2).toUpperCase() || "US"}
                        </div>
                        <div>
                          <p className="font-bold">{workspace.owner.name}</p>
                          <p className="text-xs text-muted-foreground">{workspace.owner.email}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => triggerImpersonate({ userId: workspace.ownerId, user: workspace.owner })}
                        variant="ghost"
                        size="sm"
                        className="rounded-lg font-bold text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                      >
                        <LogIn className="size-3.5" /> Acessar Conta
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">Nenhum proprietário definido.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Últimos Treinos prescritos */}
            <Card className="border-border/40 shadow-sm bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Dumbbell className="size-5 text-primary" /> Atividade Recente
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-widest">Últimos treinos prescritos nesta assessoria</CardDescription>
              </CardHeader>
              <CardContent>
                {workspace.workouts?.length > 0 ? (
                  <div className="space-y-4">
                    {workspace.workouts.map((workout: any) => (
                      <div key={workout.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-secondary/20 transition-colors">
                        <div>
                          <p className="font-bold text-sm">{workout.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Aluno: {workout.student?.name || "Geral"}</p>
                        </div>
                        <Badge variant="outline" className="font-semibold uppercase text-[10px]">{workout.difficulty}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border border-dashed border-border/60 rounded-xl">
                    <p className="text-sm font-medium text-muted-foreground">Nenhum treino gerado ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. ABA MEMBROS & ACESSO */}
        <TabsContent value="membros" className="animate-in fade-in duration-300">
          <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Lista de Membros Ativos
              </CardTitle>
              <CardDescription className="text-xs">
                Auditoria de perfis e acessos diretos para suporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {workspace.members && workspace.members.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/5 border-b border-border/30 hover:bg-secondary/5">
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Membro</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Função</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Foco Streak</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Progresso</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Último Acesso</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/20">
                      {workspace.members.map((member: any) => (
                        <TableRow key={member.id} className="hover:bg-secondary/15 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center border border-primary/20 text-xs uppercase shrink-0">
                                {member.user?.name?.substring(0, 2).toUpperCase() || member.user?.email?.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">{member.user?.name || "Sem Nome"}</p>
                                <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className={cn(
                              "font-bold uppercase text-[9px] tracking-wider border",
                              member.role === "OWNER" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                              member.role === "TRAINER" && "bg-primary/10 text-primary border-primary/20",
                              member.role === "STUDENT" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              member.role === "ASSISTANT" && "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            )}>
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1 font-bold text-sm">
                              <Flame className="size-4 text-orange-500 fill-current animate-pulse" />
                              <span>{member.streak || 0}</span>
                              <span className="text-[10px] text-muted-foreground font-medium">/{member.bestStreak || 0}d</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1 max-w-[100px] mx-auto">
                              <span className="text-xs font-bold text-foreground">{member.progress || 0}%</span>
                              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${member.progress || 0}%` }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <span className="text-xs font-medium text-muted-foreground">
                              {member.lastActive ? new Date(member.lastActive).toLocaleDateString("pt-BR") : "Nunca"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {member.user?.whatsapp && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 rounded-lg text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                                  onClick={() => window.open(`https://wa.me/55${member.user.whatsapp.replace(/\D/g, "")}`, "_blank")}
                                  title="Enviar mensagem via WhatsApp"
                                >
                                  <MessageCircle className="size-4" />
                                </Button>
                              )}
                              <Button
                                onClick={() => triggerImpersonate(member)}
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg font-bold text-xs gap-1 hover:bg-primary hover:text-primary-foreground border-border/60 shadow-xs cursor-pointer"
                              >
                                <LogIn className="size-3.5" />
                                Acessar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground opacity-60">
                  <AlertCircle className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhum membro cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. ABA CONTROLE FINANCEIRO */}
        <TabsContent value="financeiro" className="animate-in fade-in duration-300">
          <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Movimentação Financeira Interna (Alunos)
              </CardTitle>
              <CardDescription className="text-xs">
                Controle econômico da assessoria e intervenção manual de cobranças.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {workspace.payments && workspace.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/5 border-b border-border/30 hover:bg-secondary/5">
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aluno</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plano Contratado</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Valor</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Forma de Pagamento</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Data</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/20">
                      {workspace.payments.map((payment: any) => (
                        <TableRow key={payment.id} className="hover:bg-secondary/15 transition-colors">
                          <TableCell className="px-6 py-4 font-bold text-sm text-foreground">
                            {payment.studentName}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                              <span>{payment.planName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center font-black text-sm text-foreground">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(payment.amount)}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <Badge variant="outline" className="font-mono text-[9px] font-semibold border-border/40 uppercase bg-secondary/50">
                              {payment.method || "PIX"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <Badge className={cn(
                              "font-bold uppercase text-[9px] tracking-wider border border-transparent shadow-none rounded-full px-2.5 py-0.5",
                              payment.status === "pago" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              payment.status === "pendente" && "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
                              payment.status === "atrasado" && "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            )}>
                              {payment.status === "pago" ? "Pago" : payment.status === "pendente" ? "Pendente" : "Atrasado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center font-medium text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button
                              onClick={() => triggerModeratePayment(payment)}
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg font-bold text-xs gap-1 hover:bg-primary hover:text-primary-foreground border-border/60 shadow-xs cursor-pointer"
                            >
                              <Sliders className="size-3.5" />
                              Moderar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground opacity-60">
                  <CreditCard className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhuma transação interna realizada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================= MODAIS DE INTERMEDIAÇÃO ================= */}

      {/* 1. Modal de Confirmação de Impersonate */}
      <Dialog open={isImpersonateOpen} onOpenChange={setIsImpersonateOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50">
          {memberToImpersonate && (
            <>
              <DialogHeader className="space-y-3">
                <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <LogIn className="size-6" />
                </div>
                <DialogTitle className="font-black text-xl text-center flex items-center justify-center gap-2">
                  Aviso de Acesso Seguro (Auditoria)
                </DialogTitle>
                <DialogDescription className="text-sm font-medium leading-relaxed text-center">
                  Você está prestes a entrar temporariamente como <strong>{memberToImpersonate.user?.name || "Usuário"} ({memberToImpersonate.user?.email})</strong>.
                  Todas as suas ações no painel dele serão salvas em seu nome sob registros de auditoria. Use apenas para fins de ajuda ou verificação de problemas.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6 gap-2 sm:justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsImpersonateOpen(false);
                    setMemberToImpersonate(null);
                  }}
                  className="rounded-xl font-bold h-11 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImpersonate}
                  disabled={isImpersonating}
                  className="rounded-xl h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {isImpersonating ? (
                    <><Loader2 className="size-4 animate-spin mr-2" /> Acessando...</>
                  ) : "Sim, Entrar na Conta"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Modal de Moderação Financeira */}
      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => {
        setIsPaymentModalOpen(open);
        if (!open) setSelectedPayment(null);
      }}>
        <DialogContent className="max-w-md rounded-2xl border-border/50">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight">Moderar Cobrança</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Aluno: {selectedPayment.studentName} · Plano: {selectedPayment.planName}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alterar Status do Pagamento</p>
                  <Select
                    defaultValue={selectedPayment.status}
                    onValueChange={(val) => handleUpdatePaymentStatus(val)}
                    disabled={updatingPaymentStatus || deletingPayment}
                  >
                    <SelectTrigger className="rounded-xl h-12 w-full border-border/40 font-bold">
                      <SelectValue placeholder="Selecione o novo status..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      <SelectItem value="pago" className="font-bold text-xs text-emerald-500">PAGO</SelectItem>
                      <SelectItem value="pendente" className="font-bold text-xs text-amber-500">PENDENTE</SelectItem>
                      <SelectItem value="atrasado" className="font-bold text-xs text-rose-500">ATRASADO</SelectItem>
                    </SelectContent>
                  </Select>
                  {updatingPaymentStatus && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse pl-1 pt-1">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Salvando alteração de status...</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-border/40 bg-secondary/10 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Valor Cobrado:</span>
                    <span className="text-foreground">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Método:</span>
                    <span className="text-foreground uppercase">{selectedPayment.method}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Registrado em:</span>
                    <span className="text-foreground">{new Date(selectedPayment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/20 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setIsDeletePaymentAlertOpen(true)}
                  variant="ghost"
                  type="button"
                  disabled={updatingPaymentStatus || deletingPayment}
                  className="rounded-xl hover:bg-rose-500/10 h-11 font-black hover:text-rose-600 transition-all cursor-pointer mr-auto text-rose-500 flex gap-1.5"
                >
                  <Trash2 className="size-4" /> Excluir Cobrança
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setSelectedPayment(null);
                    }}
                    disabled={updatingPaymentStatus || deletingPayment}
                    className="rounded-xl font-bold h-11"
                  >
                    Fechar
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. AlertDialog de Exclusão Física de Cobrança */}
      <AlertDialog open={isDeletePaymentAlertOpen} onOpenChange={setIsDeletePaymentAlertOpen}>
        <AlertDialogContent className="rounded-2xl border-rose-500/20 shadow-2xl shadow-rose-500/5">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
              <Trash2 className="size-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black tracking-tight text-center">Excluir Cobrança Definitivamente?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground text-center">
              Tem certeza que deseja excluir permanentemente o registro de cobrança do aluno <strong className="text-foreground">{selectedPayment?.studentName}</strong>? Esta ação é irreversível e pode afetar as métricas financeiras acumuladas e o acesso aos treinos dele na assessoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 gap-2 sm:justify-center">
            <AlertDialogCancel className="rounded-xl font-bold h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePaymentConfirm}
              disabled={deletingPayment}
              className="rounded-xl h-11 px-8 font-black bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 cursor-pointer flex gap-1.5"
            >
              {deletingPayment ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Excluir de Vez</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overlay de Transição de Conta (Impersonate) */}
      {isImpersonating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6 py-8 rounded-2xl border border-border/50 bg-card shadow-2xl">
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 animate-bounce">
              <LogIn className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight">Transição de Conta</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Estabelecendo login seguro...
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1 font-medium">
                Acessando o ecossistema do AtlasFit com as credenciais do usuário para suporte. Por favor, aguarde.
              </p>
            </div>
            <Loader2 className="size-6 text-primary animate-spin mt-2" />
          </div>
        </div>
      )}
    </div>
  );
}
