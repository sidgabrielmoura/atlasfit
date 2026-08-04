"use client"

import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  Building2,
  Dumbbell,
  TrendingUp,
  DollarSign,
  UserPlus,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
  CalendarDays,
  Zap,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function StatCard({ title, value, change, icon: Icon, description }: {
  title: string; value: string; change?: number; icon: any; description?: string;
}) {
  return (
    <motion.div variants={item as any}>
      <Card className="border border-border/80 bg-card shadow-xs hover:border-foreground/20 transition-all duration-200">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary transition-colors duration-300">
              <Icon className="size-4" />
            </div>
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                change >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
              )}>
                {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold tracking-tight mt-1">{value}</h3>
            {description && (
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectionHeader({ title, icon: Icon, description }: { title: string; icon: any; description: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 px-1">
      <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-base font-bold tracking-tight leading-none">{title}</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{description}</p>
      </div>
    </div>
  );
}

function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

export default function SuperAdminDashboardPage() {
  const snap = useSnapshot(superAdminStore);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    superAdminActions.fetchMetrics();
  }, []);

  if (!snap.metrics && snap.isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-56 rounded-md" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 border border-border/80 rounded-xl bg-card space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-72 w-full rounded-xl" />
          <Skeleton className="lg:col-span-5 h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Deep-clone the entire metrics object to escape Valtio's frozen proxy
  const metrics = deepClone(snap.metrics) || {
    users: { total: 0, active: 0, growth: 0, newRecent: 0, engagement: 0 },
    workspaces: { total: 0, growth: 0 },
    workouts: { total: 0, avgFrequency: 0 },
    financial: { mrr: 0, arr: 0 }
  };

  const userGrowthData: any[] = deepClone(metrics.userGrowthData) || [];
  const financialGrowthData: any[] = deepClone(metrics.financialGrowthData) || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-10 max-w-400 mx-auto animate-in fade-in duration-700">
      {/* 1. Cabeçalho Principal */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 border-b border-border/40 pb-6 md:pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <ShieldAlert className="size-4" />
            Global Control Panel
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">Dashboard Global</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Visão completa e métricas em tempo real da plataforma AtlasFit.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status da Plataforma</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 mt-0.5">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMAS ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* 2. Estatísticas Gerais (Bento-Grid de Cards) */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Usuários" value={metrics.users.total.toLocaleString()} change={metrics.users.growth} icon={Users} description="Alunos e Personals" />
        <StatCard title="Usuários Ativos" value={metrics.users.active.toLocaleString()} icon={Activity} description="Ativos nos últimos 30 dias" />
        <StatCard title="Workspaces Ativos" value={metrics.workspaces.total.toLocaleString()} change={metrics.workspaces.growth} icon={Building2} description="Assessorias e Equipes" />
        <StatCard title="MRR Global" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metrics.financial.mrr)} icon={DollarSign} description="Faturamento Recorrente Mensal" />
      </motion.div>

      {/* 3. Área de Gráficos Comparativos (Padrão Aluno/Personal) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Gráfico Financeiro */}
        <Card className="lg:col-span-7 border-border/40 bg-card/50 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" /> Crescimento de Receita (MRR)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Evolução do faturamento recorrente global da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="h-[280px] w-full min-w-0">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillMRR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-bold text-muted-foreground" />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} className="text-[10px] font-bold text-muted-foreground" />
                    <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="mrr" name="Faturamento" stroke="var(--primary)" strokeWidth={2.5} fill="url(#fillMRR)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Cadastro de Usuários */}
        <Card className="lg:col-span-5 border-border/40 bg-card/50 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Users className="size-4 text-primary" /> Evolução de Contas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Adesão de novos usuários na base global</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <div className="h-[280px] w-full min-w-0">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-bold text-muted-foreground" />
                    <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold text-muted-foreground" />
                    <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px" }} />
                    <Bar dataKey="total" name="Usuários" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Métricas de Plataforma e Comunidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section>
          <SectionHeader title="Usuários & Engajamento" icon={Users} description="Métricas de adesão individual" />
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard title="Novos (7 dias)" value={`+${metrics.users.newRecent || 0}`} icon={UserPlus} description="Cadastros recentes" />
            <StatCard title="Retenção Técnica" value={`${metrics.users.engagement || 0}%`} icon={Target} description="Fator de atividade diária" />
          </motion.div>
        </section>

        <section>
          <SectionHeader title="Performance Financeira" icon={DollarSign} description="Volume econômico estimado" />
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard title="MRR Estimado" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metrics.financial.mrr)} icon={TrendingUp} description="Saúde mensal recorrente" />
            <StatCard title="ARR Estimado" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metrics.financial.arr)} icon={BarChart3} description="Projeção anual recorrente" />
          </motion.div>
        </section>
      </div>

      {/* 5. Seção de Treinamento */}
      <section>
        <SectionHeader title="Atividade de Treino" icon={Dumbbell} description="Dados de check-ins e uso da plataforma" />
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard title="Total de Exercícios/Treinos" value={metrics.workouts.total.toLocaleString()} icon={Dumbbell} description="Treinos gerados na plataforma" />
          <StatCard title="Frequência Média" value={`${metrics.workouts.avgFrequency || 0}x`} icon={Zap} description="Check-ins semanais por aluno" />
        </motion.div>
      </section>
    </div>
  );
}
