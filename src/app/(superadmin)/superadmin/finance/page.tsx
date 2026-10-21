"use client";

import { financeTransactionsSchema, type FinanceTransactions } from "@/modules/workspaces/domain/superadmin-finance";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  BadgeCheck,
  AlertCircle,
  BarChart3,
  Percent,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { superAdminActions, useSuperAdminSnapshot } from "@/stores/superadmin.store";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Tag, Power, PowerOff, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";



const formatBRL = (value: number | null | undefined) => {
  if (value == null) return "Indisponível";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

function FinanceStatCard({ title, value, icon: Icon, description }: {
  title: string; value: string; icon: LucideIcon; description: string;
}) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>

        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-black tracking-tight mt-1">{value}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceManagementPage() {
  const snap = useSuperAdminSnapshot();
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);
  const [togglingCoupons, setTogglingCoupons] = useState<Record<string, boolean>>({});
  const [couponToDelete, setCouponToDelete] = useState<any | null>(null);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountPercent: "",
    maxUses: "",
    expirationDate: ""
  });

  // States for transaction listing, filters and pagination
  const [activeTab, setActiveTab] = useState<"APPROVED" | "FAILED">("APPROVED");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedPersonal, setSelectedPersonal] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsData, setTransactionsData] = useState<FinanceTransactions | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionAttempt, setTransactionAttempt] = useState(0);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  useEffect(() => {
    superAdminActions.fetchFinance();
    superAdminActions.fetchCoupons();
    superAdminActions.fetchPlans();
    superAdminActions.fetchUsers();
  }, []);

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) {
        return "Agora mesmo";
      } else if (diffMins < 60) {
        return `Há ${diffMins} min`;
      } else if (diffHours < 24) {
        return `Há ${diffHours}h`;
      } else if (diffDays === 1) {
        return "Ontem";
      } else {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
      }
    } catch {
      return "Recente";
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingTx(true); setTransactionsError(null); setTransactionsData(null);
    const params = new URLSearchParams({ status: activeTab, page: String(currentPage), limit: "10", dateRange: selectedDate });
    if (selectedPersonal !== "all") params.set("userId", selectedPersonal);
    if (selectedPlan !== "all") params.set("planId", selectedPlan);
    void (async () => {
      try {
        const response = await fetch("/api/superadmin/finance/transactions?" + params.toString(), { signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível carregar as transações.");
        const result = financeTransactionsSchema.parse(await response.json());
        if (!controller.signal.aborted) setTransactionsData(result);
      } catch (error: unknown) {
        if (!controller.signal.aborted) setTransactionsError("Não foi possível carregar as transações. Tente novamente.");
      } finally { if (!controller.signal.aborted) setIsLoadingTx(false); }
    })();
    return () => controller.abort();
  }, [activeTab, selectedDate, selectedPersonal, selectedPlan, currentPage, transactionAttempt]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedDate, selectedPersonal, selectedPlan]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCoupon(true);
    try {
      await superAdminActions.createCoupon({
        code: couponForm.code,
        discountPercent: parseInt(couponForm.discountPercent),
        maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : undefined,
        expirationDate: couponForm.expirationDate || undefined
      });
      toast.success("Cupom criado com sucesso!");
      setIsCouponModalOpen(false);
      setCouponForm({ code: "", discountPercent: "", maxUses: "", expirationDate: "" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar cupom.");
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string, newStatus: boolean) => {
    setTogglingCoupons(prev => ({ ...prev, [id]: true }));
    try {
      await superAdminActions.toggleCouponStatus(id, newStatus);
      toast.success(newStatus ? "Cupom ativado com sucesso!" : "Cupom desativado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status do cupom.");
    } finally {
      setTogglingCoupons(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete) return;
    setIsDeletingCoupon(true);
    try {
      await superAdminActions.deleteCoupon(couponToDelete.id);
      toast.success("Cupom excluído com sucesso!");
      setCouponToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir cupom.");
    } finally {
      setIsDeletingCoupon(false);
    }
  };

  const data = snap.financeData;
  const recentUpgradesList = data?.recentUpgrades || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* 1. Cabeçalho alinhado com o padrão Aluno/Personal */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 border-b border-border/40 pb-6 md:pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <DollarSign className="size-4" />
            Global Treasury
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Financeiro Global</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Consolidado de receita, assinaturas e saúde econômica da plataforma.</p>
        </div>
        <Button variant="outline" disabled={snap.financeLoading} onClick={() => void superAdminActions.fetchFinance()}>
          {snap.financeLoading && <Loader2 className="size-4 animate-spin" />} Atualizar indicadores
        </Button>
      </div>

      {snap.financeError && <Alert variant="destructive"><AlertDescription>{snap.financeError}{data && " Os valores abaixo são da última consulta concluída."}</AlertDescription></Alert>}
      {snap.financeLoading && !data ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div> : data && <>
        <p className="text-xs text-muted-foreground">Consulta de {new Date(data.snapshot.asOf).toLocaleString("pt-BR", { timeZone: data.snapshot.timezone })} • Fuso de São Paulo. Assinaturas Personal e licenças de academias; cobranças dos alunos pertencem ao financeiro de cada academia.</p>
        {data.unvaluedSubscriptionsCount > 0 && <Alert><AlertDescription>{data.unvaluedSubscriptionsCount} de {data.eligibleSubscriptionsCount} assinaturas vigentes sem preço ou ciclo válido. Subtotal conhecido: {formatBRL(data.knownMonthlyReferenceInCents / 100)} por mês.</AlertDescription></Alert>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <FinanceStatCard title="Transações aprovadas" value={formatBRL(data.totalRevenue)} icon={DollarSign} description="Registros com status aprovado; não é conciliação bancária" />
          <FinanceStatCard title="Referência mensal" value={formatBRL(data.mrr)} icon={TrendingUp} description="Catálogo atual normalizado por ciclo; sem preço contratado preservado" />
          <FinanceStatCard title="Referência anual" value={formatBRL(data.arr)} icon={BarChart3} description="Referência mensal multiplicada por 12" />
          <FinanceStatCard title="LTV" value="Indisponível" icon={Users} description="Histórico de receita por cliente insuficiente" />
          <FinanceStatCard title="Churn" value="Indisponível" icon={ArrowDownRight} description="Histórico da coorte de assinaturas insuficiente" />
        </div>
      </>}
      <Card className="border-border/40 bg-card/50">
        <CardHeader><CardTitle>Histórico de receita recorrente</CardTitle><CardDescription>Disponibilidade dos dados SaaS</CardDescription></CardHeader>
        <CardContent><Empty><EmptyHeader><EmptyTitle>Histórico indisponível</EmptyTitle><EmptyDescription>{data?.unavailableReason || "Aguardando consulta dos indicadores."}</EmptyDescription></EmptyHeader></Empty></CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gestão Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight leading-none">Gestão de Transações</h2>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">Monitoramento em tempo real de fluxos financeiros</p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "APPROVED" | "FAILED")} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <TabsList className="bg-secondary/20 p-1 rounded-2xl h-auto flex gap-1">
                <TabsTrigger value="APPROVED" className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:text-primary cursor-pointer transition-all">
                  <BadgeCheck className="size-4 text-emerald-600" />
                  Transações aprovadas
                </TabsTrigger>
                <TabsTrigger value="FAILED" className="px-4 py-2 text-xs font-bold gap-2 rounded-xl data-[state=active]:bg-card data-[state=active]:text-primary cursor-pointer transition-all">
                  <AlertCircle className="size-4 text-rose-600" />
                  Tentativas falhas
                </TabsTrigger>
              </TabsList>

              {/* Indicador rápido de valor */}
              <div className="text-right px-1">
                {activeTab === "APPROVED" ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aprovados criados hoje</span>
                    <span className="text-lg font-black text-emerald-600 leading-none mt-1">{formatBRL(data?.todaysRevenue)}</span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tentativas falhas registradas</span>
                    <span className="text-lg font-black text-rose-600 leading-none mt-1">{formatBRL(data?.totalFailedRevenue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filtros em Linha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-card/30 p-3 rounded-2xl border border-border/40">
              {/* Filtro Período */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1">Período</span>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-card/50 border-border/40 text-xs font-semibold cursor-pointer">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todo o histórico</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="thisyear">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Personal */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1">Personal Trainer</span>
                <Select value={selectedPersonal} onValueChange={setSelectedPersonal}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-card/50 border-border/40 text-xs font-semibold cursor-pointer">
                    <SelectValue placeholder="Personal Trainer" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todos os Personals</SelectItem>
                    {snap.users.filter((u: any) => u.role === "TRAINER").map((trainer: any) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Planos */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1">Plano atual</span>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-card/50 border-border/40 text-xs font-semibold cursor-pointer">
                    <SelectValue placeholder="Plano atual" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todos os Planos</SelectItem>
                    {snap.plans.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="border-border/40 overflow-hidden shadow-sm p-0 space-y-0! gap-0!">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-secondary/10 border-b border-border/40">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conta / Cliente</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plano atual</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Status / Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {isLoadingTx ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={idx} className="border-b border-border/30">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Skeleton className="size-8 rounded-lg" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-40" />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Skeleton className="h-4 w-24 ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : transactionsError ? (
                        <tr><td colSpan={4} className="px-6 py-8"><Alert variant="destructive"><AlertDescription>{transactionsError}</AlertDescription></Alert><Button variant="outline" onClick={() => setTransactionAttempt(v => v + 1)} className="mt-3">Tentar novamente</Button></td></tr>
                      ) : !transactionsData || transactionsData.data.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                            Nenhuma transação encontrada com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        transactionsData.data.map((tx, idx) => {
                          const planName = tx.user.subscription?.plan.name || "Sem plano atual";
                          const dateObj = new Date(tx.createdAt);
                          const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(dateObj);

                          return (
                            <tr key={tx.id || idx} className="hover:bg-secondary/20 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                    {tx.user.name?.slice(0, 2).toUpperCase() || "CP"}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold leading-none truncate">{tx.user?.name || "Personal"}</span>
                                    <span className="text-[10px] text-muted-foreground mt-1 truncate font-semibold">{tx.user?.email || "Sem email"}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-foreground leading-none">{planName}</span>
                                  {tx.paymentMethod && (
                                    <span className="text-[9px] text-muted-foreground mt-1 font-semibold uppercase tracking-wider">
                                      {tx.paymentMethod === "CREDIT_CARD" ? "Cartão de Crédito" : tx.paymentMethod}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-primary">{formatBRL(tx.amount)}</span>
                                  {tx.status === "FAILED" && tx.description && (
                                    <span className="text-[9px] text-rose-500 mt-1 font-medium max-w-[180px] truncate" title={tx.description}>
                                      {tx.description}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex flex-col items-end">
                                  <span className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-1 tracking-wider",
                                    tx.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                  )}>
                                    {tx.status === "APPROVED" ? "Aprovado" : "Falhou"}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground font-semibold">{formattedDate}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>

              {/* Controles de Paginação */}
              {transactionsData && transactionsData.pagination.pages > 1 && (
                <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/5">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Página {transactionsData.pagination.page} de {transactionsData.pagination.pages} ({transactionsData.pagination.total} transações)
                  </span>
                  <Pagination className="w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={cn(currentPage <= 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                      {Array.from({ length: transactionsData.pagination.pages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        if (
                          pageNum === 1 ||
                          pageNum === transactionsData.pagination.pages ||
                          Math.abs(pageNum - currentPage) <= 1
                        ) {
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                                isActive={currentPage === pageNum}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          pageNum === 2 ||
                          pageNum === transactionsData.pagination.pages - 1
                        ) {
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < transactionsData.pagination.pages) setCurrentPage(currentPage + 1);
                          }}
                          className={cn(currentPage >= transactionsData.pagination.pages && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </Card>
          </Tabs>
        </div>

        {/* Sidebar Widgets (Assinaturas, Cupons, Upgrades) */}
        <div className="space-y-6">
          <Card className="border-border/40 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Percent className="size-4 text-primary" /> Cupons & Promoções
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCouponModalOpen(true)}
                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                <Plus className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[350px] overflow-y-auto font-sans">
              {snap.coupons.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center gap-2 opacity-60">
                  <Tag className="size-8 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Nenhum cupom ativo</span>
                </div>
              ) : snap.coupons.map((coupon: any) => {
                const isExpired = coupon.expirationDate && new Date(coupon.expirationDate) < new Date();
                return (
                  <div key={coupon.id} className={cn(
                    "flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-all group",
                    coupon.isActive && !isExpired ? "bg-secondary/40" : "bg-secondary/10 opacity-60"
                  )}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-black tracking-tight group-hover:text-primary transition-colors",
                          (!coupon.isActive || isExpired) && "line-through text-muted-foreground"
                        )}>
                          {coupon.code}
                        </span>
                        {isExpired ? (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-sans font-bold">Expirado</span>
                        ) : !coupon.isActive ? (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-sans font-bold">Inativo</span>
                        ) : null}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ""} usos
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-sans">
                      <span className={cn(
                        "text-xs font-black mr-1",
                        coupon.isActive && !isExpired ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        -{coupon.discountPercent}%
                      </span>
                      
                      {!isExpired && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={togglingCoupons[coupon.id]}
                          onClick={() => handleToggleCoupon(coupon.id, !coupon.isActive)}
                          className={cn(
                            "size-7 rounded-lg cursor-pointer",
                            coupon.isActive ? "text-rose-500 hover:bg-rose-500/10" : "text-emerald-500 hover:bg-emerald-500/10"
                          )}
                        >
                          {togglingCoupons[coupon.id] ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : coupon.isActive ? (
                            <PowerOff className="size-3" />
                          ) : (
                            <Power className="size-3" />
                          )}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={togglingCoupons[coupon.id]}
                        onClick={() => setCouponToDelete(coupon)}
                        className="size-7 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Modal Novo Cupom */}
          <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight">Criar Novo Cupom</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCoupon} className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Código do Cupom</Label>
                  <Input
                    id="code"
                    required
                    placeholder="Ex: VERÃO25"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                    className="rounded-xl h-11 border-border/40 focus:border-primary font-black uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Desconto (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      required
                      min="1"
                      max="100"
                      placeholder="Ex: 20"
                      value={couponForm.discountPercent}
                      onChange={(e) => setCouponForm({ ...couponForm, discountPercent: e.target.value })}
                      className="rounded-xl h-11 border-border/40 focus:border-primary font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxUses" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Limite de Usos</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      placeholder="Ilimitado"
                      value={couponForm.maxUses}
                      onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                      className="rounded-xl h-11 border-border/40 focus:border-primary font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data de Expiração (Opcional)</Label>
                  <Input
                    id="expiry"
                    type="date"
                    value={couponForm.expirationDate}
                    onChange={(e) => setCouponForm({ ...couponForm, expirationDate: e.target.value })}
                    className="rounded-xl h-11 border-border/40 focus:border-primary font-bold"
                  />
                </div>
                <DialogFooter className="pt-2 gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsCouponModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                  <Button type="submit" disabled={isSubmittingCoupon} className="rounded-xl h-11 px-8 font-black uppercase tracking-widest gap-2 bg-primary cursor-pointer text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                    {isSubmittingCoupon && <Loader2 className="size-4 animate-spin" />}
                    {isSubmittingCoupon ? "Gerando..." : "Gerar Cupom"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Card className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ArrowUpRight className="size-4 text-emerald-600" /> Upgrades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentUpgradesList.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                  Nenhum upgrade recente
                </div>
              ) : (
                recentUpgradesList.map((up: any) => (
                  <div key={up.id || up.user} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 animate-in fade-in duration-300">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{up.user}</span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{up.from} → {up.to}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold">{formatRelativeTime(up.date)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground font-medium">
              Você está prestes a deletar o cupom <span className="font-bold text-foreground">"{couponToDelete?.code}"</span>. Esta ação removerá o cupom do banco de dados e do AbacatePay permanentemente, e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeletingCoupon} className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingCoupon}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCoupon();
              }}
              className="rounded-xl font-black uppercase tracking-widest gap-2 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {isDeletingCoupon && <Loader2 className="size-4 animate-spin" />}
              {isDeletingCoupon ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
