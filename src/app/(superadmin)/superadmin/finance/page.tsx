"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  CalendarDays,
  BadgeCheck,
  AlertCircle,
  BarChart3,
  Percent,
  History,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Tag, Power, PowerOff } from "lucide-react";

const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

function FinanceStatCard({ title, value, change, icon: Icon, description, trend }: {
  title: string; value: string; change: string; icon: any; description: string; trend: "up" | "down";
}) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
            trend === "up" ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
          )}>
            {trend === "up" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {change}
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
  const snap = useSnapshot(superAdminStore);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountPercent: "",
    maxUses: "",
    expirationDate: ""
  });

  useEffect(() => {
    superAdminActions.fetchFinance();
    superAdminActions.fetchCoupons();
  }, []);

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

  const data = snap.financeData || {
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    todaysRevenue: 0,
    totalFailedRevenue: 0,
    ltv: 0,
    churn: 0,
    recentTransactions: []
  };

  return (
    <div className="p-6 md:p-8 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Financeiro Global</h1>
          <p className="text-muted-foreground text-sm font-medium">Consolidado de receita, assinaturas e saúde econômica da plataforma.</p>
        </div>
        <div className="flex max-md:flex-col items-center gap-3">
          <Button variant="outline" className="h-11 max-md:w-full rounded-xl gap-2 font-bold text-xs border-border/60 px-6">
            <Download className="size-4" /> EXPORTAR RELATÓRIO
          </Button>
          <Button className="h-11 max-md:w-full rounded-xl gap-2 font-bold bg-primary text-primary-foreground px-6 shadow-lg shadow-primary/20">
            CONCILIAR PAGAMENTOS
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <FinanceStatCard title="Receita Total" value={formatBRL(data.totalRevenue)} change="+0.0%" icon={DollarSign} description="Volume total processado" trend="up" />
        <FinanceStatCard title="MRR Global" value={formatBRL(data.mrr)} change="+0.0%" icon={TrendingUp} description="Receita mensal recorrente" trend="up" />
        <FinanceStatCard title="ARR Global" value={formatBRL(data.arr)} change="+0.0%" icon={BarChart3} description="Receita anual estimada" trend="up" />
        <FinanceStatCard title="LTV Médio" value={formatBRL(data.ltv)} change="+0.0%" icon={Users} description="Valor médio por cliente" trend="up" />
        <FinanceStatCard title="Churn Financeiro" value={`${data.churn.toFixed(1)}%`} change="-0.0%" icon={ArrowDownRight} description="Perda de receita mensal" trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gestão Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 mb-2 px-1">
            <div className="p-2 rounded-xl bg-secondary/80 text-foreground border border-border/40">
              <CreditCard className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight leading-none">Gestão de Transações</h2>
              <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">Monitoramento em tempo real de fluxos financeiros</p>
            </div>
          </div>

          <Card className="border-border/40 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border/40 bg-secondary/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <BadgeCheck className="size-4" />
                </div>
                <span className="text-sm font-bold">Pagamentos Aprovados (Hoje)</span>
              </div>
              <span className="text-lg font-black text-emerald-600">{formatBRL(data.todaysRevenue)}</span>
            </div>
            <div className="p-6 border-b border-border/40 bg-rose-500/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                  <AlertCircle className="size-4" />
                </div>
                <span className="text-sm font-bold">Inadimplência Acumulada</span>
              </div>
              <span className="text-lg font-black text-rose-600">{formatBRL(data.totalFailedRevenue)}</span>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/10 border-b border-border/40">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace / Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plano</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {data.recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm font-medium text-muted-foreground">
                          Nenhuma transação recente encontrada.
                        </td>
                      </tr>
                    ) : data.recentTransactions.map((tx: any, idx: number) => {
                      const planName = tx.workspace?.subscription?.plan?.name || "Sem Plano";
                      const dateObj = new Date(tx.createdAt);
                      const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(dateObj);

                      return (
                        <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {tx.workspace?.logo || "CP"}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold leading-none truncate">{tx.user?.name || tx.workspace?.name || "Personal"}</span>
                                <span className="text-[10px] text-muted-foreground mt-1 truncate font-semibold">{tx.user?.email || "Sem email"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground leading-none">{planName}</span>
                              <span className="text-[9px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">{formattedDate}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-primary">{formatBRL(tx.amount)}</td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                              <History className="size-4 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
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
              ) : snap.coupons.map((coupon: any) => (
                <div key={coupon.id} className={cn(
                  "flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-all group",
                  coupon.isActive ? "bg-secondary/40" : "bg-secondary/10 opacity-60"
                )}>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-black tracking-tight group-hover:text-primary transition-colors",
                        !coupon.isActive && "line-through text-muted-foreground"
                      )}>
                        {coupon.code}
                      </span>
                      {!coupon.isActive && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inativo</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ""} usos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-black",
                      coupon.isActive ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      -{coupon.discountPercent}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => superAdminActions.toggleCouponStatus(coupon.id, !coupon.isActive)}
                      className={cn(
                        "size-7 rounded-lg",
                        coupon.isActive ? "text-rose-500 hover:bg-rose-500/10" : "text-emerald-500 hover:bg-emerald-500/10"
                      )}
                    >
                      {coupon.isActive ? <PowerOff className="size-3" /> : <Power className="size-3" />}
                    </Button>
                  </div>
                </div>
              ))}
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
                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsCouponModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                  <Button type="submit" disabled={isSubmittingCoupon} className="rounded-xl font-black uppercase tracking-widest gap-2 bg-primary px-8">
                    {isSubmittingCoupon && <Loader2 className="size-4 animate-spin" />}
                    Gerar Cupom
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
              {[
                { from: "Starter", to: "Pro", user: "Ana B.", date: "Há 2h" },
                { from: "Pro", to: "Enterprise", user: "Iron Gym", date: "Há 5h" },
              ].map((up, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{up.user}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{up.from} → {up.to}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">{up.date}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
