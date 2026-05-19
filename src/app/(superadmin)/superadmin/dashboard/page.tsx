"use client"

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { Card, CardContent } from "@/components/ui/card";
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
  BadgeCheck,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

function StatCard({ title, value, change, icon: Icon, description }: {
  title: string; value: string; change?: number; icon: any; description?: string;
}) {
  return (
    <Card className="border-border/40 bg-card/50 shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            <Icon className="size-4" />
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
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
  );
}

function SectionHeader({ title, icon: Icon, description }: { title: string; icon: any; description: string }) {
  return (
    <div className="flex items-center gap-4 mb-6 px-1">
      <div className="p-2 rounded-xl bg-secondary/80 text-foreground border border-border/40">
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

  useEffect(() => {
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

  return (
    <div className="p-6 md:p-8 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700">
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
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMAS ONLINE
            </span>
          </div>
        </div>
      </div>

      <section>
        <SectionHeader title="Usuários & Comunidade" icon={Users} description="Métricas de crescimento e engajamento individual" />
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total de Usuários" value={metrics.users.total.toLocaleString()} change={metrics.users.growth} icon={Users} description="Base total cadastrada" />
          <StatCard title="Usuários Ativos" value={metrics.users.active.toLocaleString()} icon={Activity} description="Atividade em tempo real" />
          <StatCard title="Novos" value={`+${metrics.users.newRecent || 0}`} icon={UserPlus} description="Cadastros recentes (7 dias)" />
          <StatCard title="Engajamento" value={`${metrics.users.engagement || 0}%`} icon={Target} description="Fator de retenção diária" />
        </motion.div>
      </section>

      <section>
        <SectionHeader title="Workspaces & Assessorias" icon={Building2} description="Ecossistema de negócios e crescimento B2B" />
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Workspaces Ativos" value={metrics.workspaces.total.toLocaleString()} change={metrics.workspaces.growth} icon={Building2} description="Assessorias e times ativos" />
          <StatCard title="Performance" value={metrics.workspaces.growth > 0 ? "Em Alta" : "Estável"} icon={CalendarDays} description="Tendência de mercado" />
          <StatCard title="Taxa de Crescimento" value={`${metrics.workspaces.growth}%`} icon={TrendingUp} description="Aumento orgânico da base" />
          <StatCard title="Top Negócios" value="Assessorias" icon={Zap} description="Maior volume da plataforma" />
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section>
          <SectionHeader title="Engajamento & Treinos" icon={Dumbbell} description="Volume de execução e retenção técnica" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard title="Total de Treinos" value={metrics.workouts.total.toLocaleString()} icon={Dumbbell} description="Execuções totais na plataforma" />
            <StatCard title="Freq. Média" value={`${metrics.workouts.avgFrequency || 0}x`} icon={Activity} description="Treinos por aluno na base" />
          </div>
        </section>

        <section>
          <SectionHeader title="Performance Financeira" icon={DollarSign} description="Saúde econômica e planos de assinatura" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard title="MRR Global" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metrics.financial.mrr)} icon={TrendingUp} description="Receita recorrente mensal" />
            <StatCard title="ARR Estimado" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metrics.financial.arr)} icon={BarChart3} description="Receita recorrente anual" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Button({ children, variant = "primary", className, ...props }: any) {
  return (
    <button className={cn(
      "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      className
    )} {...props}>
      {children}
    </button>
  );
}
