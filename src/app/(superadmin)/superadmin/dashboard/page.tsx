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
      <Card className="border-border/40 bg-card/50 shadow-sm hover:shadow-md transition-all duration-300 group">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
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
            <h3 className="text-2xl font-black tracking-tight mt-1">{value}</h3>
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
    <div className="flex items-center gap-4 mb-6 px-1">
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold tracking-tight leading-none">{title}</h2>
        <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">{description}</p>
      </div>
    </div>
  );
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
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Carregando métricas globais...</p>
      </div>
    );
  }

  const metrics = snap.metrics || {
    users: { total: 0, active: 0, growth: 0, newRecent: 0, engagement: 0 },
    workspaces: { total: 0, growth: 0 },
    workouts: { total: 0, avgFrequency: 0 },
    financial: { mrr: 0, arr: 0 }
  };

  // Histórico real a partir dos dados do banco
  const userGrowthData = metrics.userGrowthData || [];
  const financialGrowthData = metrics.financialGrowthData || [];

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* 1. Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <ShieldAlert className="size-4" />
            Global Control Panel
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Dashboard Global</h1>
          <p className="text-muted-foreground text-sm font-medium">Visão completa e métricas em tempo real da plataforma AtlasFit.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
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
