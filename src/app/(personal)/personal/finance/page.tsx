"use client";

import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  Clock,
  Download,
  Users,
  Trash2,
  Edit,
  Loader2
} from "lucide-react";
import { workspaceStore } from "@/stores/workspace.store";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function FinancePage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  // Loading and data states
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    mrrChange: 0,
    avgTicket: 0,
    ticketChange: 0,
    activePlans: 0,
    plansChange: 0,
    financialChurn: 0,
    churnChange: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Modal states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  // Plan form states
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planInterval, setPlanInterval] = useState("mensal");
  const [planLink, setPlanLink] = useState("");
  const [planIsActive, setPlanIsActive] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Delete confirmation states
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle status confirmation states
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false);
  const [planToToggle, setPlanToToggle] = useState<any | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Copy button feedback state
  const [copiedPlanId, setCopiedPlanId] = useState<string | null>(null);

  // Fetch all finance details from API
  const fetchFinanceData = async () => {
    if (!activeWorkspaceId) return;
    setIsLoading(true);
    try {
      // 1. Fetch overview metrics, chart, and payments
      const overviewRes = await fetch(`/api/personal/finance?workspaceId=${activeWorkspaceId}`);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setMetrics(data.metrics);
        setChartData(data.chartData);
        setRecentPayments(data.recentPayments);
      } else {
        toast.error("Erro ao carregar dados do financeiro.");
      }

      // 2. Fetch subscription plans
      const plansRes = await fetch(`/api/personal/finance/plans?workspaceId=${activeWorkspaceId}`);
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      } else {
        toast.error("Erro ao carregar os planos.");
      }
    } catch (err) {
      console.error("Fetch finance error:", err);
      toast.error("Erro de conexão ao carregar finanças.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [activeWorkspaceId]);

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanPrice("");
    setPlanInterval("mensal");
    setPlanLink("");
    setPlanIsActive(true);
    setIsPlanModalOpen(true);
  };

  // Open editing modal
  const handleOpenEditModal = (plan: any) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(plan.price.toString());
    setPlanInterval(plan.interval);
    setPlanLink(plan.link || "");
    setPlanIsActive(plan.active !== undefined ? plan.active : true);
    setIsPlanModalOpen(true);
  };

  // Save Plan (Create or Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    if (!planName || !planPrice) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSavingPlan(true);
    try {
      if (editingPlan) {
        // Edit existing plan
        const res = await fetch(`/api/personal/finance/plans/${editingPlan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: planName,
            price: parseFloat(planPrice),
            interval: planInterval,
            isActive: planIsActive,
          }),
        });

        if (res.ok) {
          toast.success("Plano atualizado com sucesso!");
          setIsPlanModalOpen(false);
          fetchFinanceData();
        } else {
          const errMsg = await res.text();
          toast.error(errMsg || "Erro ao atualizar plano.");
        }
      } else {
        // Create new plan
        const res = await fetch(`/api/personal/finance/plans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            name: planName,
            price: parseFloat(planPrice),
            interval: planInterval,
            isActive: planIsActive,
          }),
        });

        if (res.ok) {
          toast.success("Plano criado com sucesso!");
          setIsPlanModalOpen(false);
          fetchFinanceData();
        } else {
          const errMsg = await res.text();
          toast.error(errMsg || "Erro ao criar plano.");
        }
      }
    } catch (err) {
      console.error("Save plan error:", err);
      toast.error("Erro ao salvar o plano.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Delete Plan Confirmation Open
  const handleOpenDeleteConfirm = (plan: any) => {
    setPlanToDelete(plan);
    setIsConfirmDeleteOpen(true);
  };

  // Delete Plan Execution
  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/personal/finance/plans/${planToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Plano excluído com sucesso!");
        setIsConfirmDeleteOpen(false);
        setPlanToDelete(null);
        fetchFinanceData();
      } else {
        const errMsg = await res.text();
        toast.error(errMsg || "Erro ao excluir plano.");
      }
    } catch (err) {
      console.error("Delete plan error:", err);
      toast.error("Erro ao conectar ao servidor para excluir plano.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Plan Active Confirmation Open
  const handleOpenToggleConfirm = (plan: any) => {
    setPlanToToggle(plan);
    setIsConfirmToggleOpen(true);
  };

  // Toggle Plan Active Execution
  const handleTogglePlanActive = async () => {
    if (!planToToggle) return;
    setIsToggling(true);
    try {
      const nextState = !planToToggle.active;
      const res = await fetch(`/api/personal/finance/plans/${planToToggle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextState,
        }),
      });

      if (res.ok) {
        toast.success(`Plano ${nextState ? "ativado" : "inativado"} com sucesso!`);
        setIsConfirmToggleOpen(false);
        setPlanToToggle(null);
        fetchFinanceData();
      } else {
        toast.error("Erro ao alterar estado do plano.");
      }
    } catch (err) {
      console.error("Toggle plan active error:", err);
      toast.error("Erro ao alterar estado do plano.");
    } finally {
      setIsToggling(false);
    }
  };

  // Copy Link Base
  const handleCopyLink = (planId: string, link: string) => {
    if (!link) {
      toast.error("Este plano não possui link de checkout cadastrado.");
      return;
    }
    navigator.clipboard.writeText(link);
    setCopiedPlanId(planId);
    toast.success("Link de checkout copiado!");
    setTimeout(() => {
      setCopiedPlanId(null);
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-success/20 text-success hover:bg-success/30 border-none">Pago</Badge>;
      case "pendente":
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30 border-none">Pendente</Badge>;
      case "atrasado":
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-none">Atrasado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Carregando workspaces...</h2>
          <p className="text-muted-foreground text-sm">Por favor, selecione um workspace para visualizar o financeiro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
          <p className="text-muted-foreground mt-1">
            Visualizando finanças de <strong className="text-foreground">{workspaceSnap.activeWorkspace?.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => fetchFinanceData()}>
            <Loader2 className={cn("size-4", isLoading && "animate-spin")} />
            <span>Atualizar</span>
          </Button>
          <Button className="gap-2" onClick={handleOpenCreateModal}>
            <Plus className="size-4" />
            <span>Novo Plano</span>
          </Button>
        </div>
      </div>

      {isLoading && plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Buscando dados financeiros do banco de dados...</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Metric Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Receita Recorrente (MRR)</CardTitle>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className={metrics.mrrChange >= 0 ? "text-success" : "text-destructive"}>
                      {metrics.mrrChange >= 0 ? "+" : ""}{metrics.mrrChange}%
                    </span>
                    vs mês anterior
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avgTicket)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className={metrics.ticketChange >= 0 ? "text-success" : "text-destructive"}>
                      {metrics.ticketChange >= 0 ? "+" : ""}{metrics.ticketChange}%
                    </span>
                    vs mês anterior
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.activePlans}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className={metrics.plansChange >= 0 ? "text-success" : "text-destructive"}>
                      {metrics.plansChange >= 0 ? "+" : ""}{metrics.plansChange} alunos
                    </span>
                    neste mês
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
                  <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="size-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.financialChurn}%</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className={metrics.churnChange <= 0 ? "text-success" : "text-destructive"}>
                      {metrics.churnChange > 0 ? "+" : ""}{metrics.churnChange}%
                    </span>
                    vs mês anterior
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Grid: Chart & Transactions vs Plans */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Revenue Chart */}
              <motion.div variants={item as any}>
                <Card>
                  <CardHeader>
                    <CardTitle>Evolução da Receita</CardTitle>
                    <CardDescription>Acompanhe o crescimento do seu faturamento nos últimos meses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                            tickFormatter={(value) => `R$${value}`}
                            dx={-10}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                            itemStyle={{ color: "var(--foreground)" }}
                            formatter={(value: number | any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), "Receita"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Payments */}
              <motion.div variants={item as any}>
                <Card>
                  <CardHeader>
                    <CardTitle>Últimos Pagamentos</CardTitle>
                    <CardDescription>Acompanhe os recebimentos e cobranças recentes cadastrados no banco de dados.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[310px] overflow-y-auto pr-2 custom-scrollbar">
                      {recentPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-secondary/10">
                          <CheckCircle2 className="size-8 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">Nenhum pagamento registrado.</p>
                        </div>
                      ) : (
                        recentPayments.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "size-10 rounded-full flex items-center justify-center shrink-0",
                                tx.status === "pago" ? "bg-success/10 text-success" :
                                  tx.status === "atrasado" ? "bg-destructive/10 text-destructive" :
                                    "bg-warning/10 text-warning"
                              )}>
                                {tx.status === "pago" ? <CheckCircle2 className="size-5" /> :
                                  tx.status === "atrasado" ? <AlertCircle className="size-5" /> :
                                    <Clock className="size-5" />}
                              </div>
                              <div>
                                <p className="font-medium text-sm leading-tight">{tx.student}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{tx.plan}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                              </p>
                              <div className="flex items-center justify-end gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground uppercase">{tx.method}</span>
                                {getStatusBadge(tx.status)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Side: Subscription Plans */}
            <div className="space-y-6">
              <motion.div variants={item as any}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Planos e Links</CardTitle>
                    <CardDescription>Links rápidos para enviar cobranças aos alunos de {workspaceSnap.activeWorkspace?.name}.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className={cn("p-4 rounded-xl border relative group transition-all", plan.active ? "bg-card border-border" : "bg-secondary/10 border-border/50 opacity-70")}>
                        
                        {/* Quick action overlay buttons on hover */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card rounded-md shadow-xs p-1 border border-border">
                          <button
                            onClick={() => handleOpenToggleConfirm(plan)}
                            title={plan.active ? "Inativar Plano" : "Ativar Plano"}
                            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Switch checked={plan.active} onCheckedChange={() => {}} className="scale-75 origin-right pointer-events-none" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(plan)}
                            title="Editar Plano"
                            className="p-1.5 hover:bg-secondary rounded-md text-primary hover:text-primary-foreground transition-colors"
                          >
                            <Edit className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteConfirm(plan)}
                            title="Excluir Plano"
                            className="p-1.5 hover:bg-secondary rounded-md text-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>

                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-sm pr-16">{plan.name}</h4>
                            <p className="text-xl font-bold mt-1">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                              <span className="text-xs text-muted-foreground font-normal">/{plan.interval}</span>
                            </p>
                          </div>
                          {!plan.active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                        </div>

                        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                          <Users className="size-3.5" />
                          <span>{plan.subscribers} assinantes ativos</span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs gap-2 h-8"
                            disabled={!plan.active || !plan.link}
                            onClick={() => handleCopyLink(plan.id, plan.link)}
                          >
                            <LinkIcon className="size-3" />
                            <span>Link Base</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-10 px-0 shrink-0 h-8"
                            disabled={!plan.active || !plan.link}
                            onClick={() => handleCopyLink(plan.id, plan.link)}
                          >
                            {copiedPlanId === plan.id ? (
                              <CheckCircle2 className="size-3.5 text-success" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      onClick={handleOpenCreateModal}
                      className="w-full mt-2 text-primary hover:text-primary/80 gap-2 border border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 h-10"
                    >
                      <Plus className="size-4" />
                      Criar Novo Plano
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plan Create/Edit Dialog */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSavePlan}>
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Editar Plano de Assinatura" : "Criar Novo Plano"}</DialogTitle>
              <DialogDescription>
                Configure os detalhes do plano que ficará disponível para os alunos de {workspaceSnap.activeWorkspace?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Consultoria Mensal, VIP Premium, etc."
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Valor (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Ciclo de Cobrança *</Label>
                  <Select value={planInterval} onValueChange={setPlanInterval}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>



              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Disponibilizar plano</Label>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Planos inativos não permitem novos cadastros nem cópia de links.
                  </p>
                </div>
                <Switch
                  checked={planIsActive}
                  onCheckedChange={setPlanIsActive}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingPlan} className="gap-2">
                {isSavingPlan && <Loader2 className="size-4 animate-spin" />}
                <span>Salvar Plano</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              <span>Excluir Plano</span>
            </DialogTitle>
            <DialogDescription className="pt-2">
              Tem certeza que deseja excluir o plano <strong className="text-foreground">{planToDelete?.name}</strong>?
              <br />
              <span className="text-destructive font-medium mt-2 inline-block">Esta ação é irreversível e removerá todos os vínculos no banco de dados.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsConfirmDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeletePlan}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              <span>Excluir</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation Dialog */}
      <Dialog open={isConfirmToggleOpen} onOpenChange={setIsConfirmToggleOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-primary" />
              <span>{planToToggle?.active ? "Inativar Plano" : "Ativar Plano"}</span>
            </DialogTitle>
            <DialogDescription className="pt-2">
              Tem certeza que deseja <strong>{planToToggle?.active ? "inativar" : "ativar"}</strong> o plano <strong className="text-foreground">{planToToggle?.name}</strong>?
              {planToToggle?.active && (
                <span className="block text-muted-foreground text-xs mt-2 font-medium">
                  Alunos não conseguirão mais assinar este plano nem visualizar seus links de checkout.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isToggling}
              onClick={() => setIsConfirmToggleOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isToggling}
              onClick={handleTogglePlanActive}
              className="gap-2 bg-primary hover:bg-primary/95 text-primary-foreground"
            >
              {isToggling && <Loader2 className="size-4 animate-spin" />}
              <span>Confirmar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
