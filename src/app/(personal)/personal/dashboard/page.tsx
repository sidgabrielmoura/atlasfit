"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserMinus, CalendarCheck, CheckCircle2, TrendingUp,
  DollarSign, CreditCard, FileText, Target,
  Flame, Trophy, Dumbbell, Activity, AlertTriangle, Clock,
  ArrowUpRight, ArrowDownRight, BarChart3, MessageSquare, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { personalInfo } from "@/lib/mock-data";
import { EngageInline } from "@/components/engage/engage-renderer";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function KPICard({ title, value, change, icon: Icon, prefix = "", suffix = "", changeLabel = "vs mês anterior" }: {
  title: string; value: string | number; change: number;
  icon: React.ElementType; prefix?: string; suffix?: string; changeLabel?: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="w-full min-w-0">
      <Card size="sm" className="relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xs h-full">
        <CardContent className="p-3 sm:p-4 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">{title}</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight">
                {prefix}
                {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
                {suffix}
              </p>
            </div>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {isPositive ? (
              <ArrowUpRight className="size-3 text-emerald-500 shrink-0" />
            ) : (
              <ArrowDownRight className="size-3 text-red-400 shrink-0" />
            )}
            <span className={cn("text-[10px] font-semibold", isPositive ? "text-emerald-500" : "text-red-400")}>
              {isPositive ? "+" : ""}
              {change}%
            </span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1">{changeLabel}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-400 mx-auto animate-pulse">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 max-w-full bg-muted rounded-lg" />
          <div className="h-4 w-full max-w-md bg-muted rounded" />
        </div>
        <div className="h-8 w-32 bg-muted rounded-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden border border-border/50">
            <CardContent className="p-4 md:p-5 flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-7 w-24 bg-muted rounded-lg" />
                <div className="h-3 w-28 bg-muted rounded" />
              </div>
              <div className="size-10 bg-muted rounded-xl shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-2">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-65 bg-muted/20 rounded-2xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-16 bg-muted rounded" />
                  <div className="h-3.5 w-12 bg-muted rounded" />
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const revenueChartConfig = {
  current: { label: "Receita Atual", color: "var(--chart-1)" },
  previous: { label: "Mês Anterior", color: "var(--chart-4)" },
};
const feedbackChartConfig = {
  count: { label: "Respostas" },
  "Muito Fácil": { label: "Muito Fácil", color: "var(--chart-5)" },
  "Fácil": { label: "Fácil", color: "var(--chart-4)" },
  "Adequado": { label: "Adequado", color: "var(--chart-1)" },
  "Difícil": { label: "Difícil", color: "var(--chart-2)" },
  "Muito Difícil": { label: "Muito Difícil", color: "var(--chart-3)" },
};
const loadChartConfig = {
  avg: { label: "Carga Média (kg)", color: "var(--chart-1)" },
  benchmark: { label: "Benchmark", color: "var(--chart-4)" },
};
const frequencyChartConfig = {
  count: { label: "Check-ins", color: "var(--chart-1)" },
};

const riskColors = { high: "text-red-400 bg-red-400/10", medium: "text-amber-400 bg-amber-400/10", low: "text-emerald-400 bg-emerald-400/10" };
const activityColors = { workout: "bg-emerald-500", record: "bg-primary", alert: "bg-red-400", feedback: "bg-blue-400", financial: "bg-amber-400" };

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const workspaceSnap = useSnapshot(workspaceStore);

  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isKpisExpanded, setIsKpisExpanded] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      if (!workspaceSnap.activeWorkspaceId) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/personal/dashboard?workspaceId=${workspaceSnap.activeWorkspaceId}`);
        if (!res.ok) {
          const errMsg = await res.text();
          throw new Error(errMsg || "Falha ao buscar as métricas do workspace.");
        }
        const data = await res.json();
        setMetrics(data);
      } catch (err: any) {
        console.error("Error loading dashboard metrics:", err);
        setError(err.message || "Falha ao carregar as métricas do workspace.");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [workspaceSnap.activeWorkspaceId]);

  if (!workspaceSnap.activeWorkspaceId) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center text-center max-w-md space-y-4">
          <div className="size-16 rounded-3xl bg-red-400/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="size-8" />
          </div>
          <h2 className="text-xl font-bold">Falha ao Carregar Painel</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !metrics) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {getGreeting()}, {user?.name || personalInfo.name} <span className="inline-block">🔥</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualizando <strong className="text-foreground">{workspaceSnap.activeWorkspace?.name}</strong>. Resumo de hoje, {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-background border-border/50 shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          {metrics.studentsMetrics.totalActive} alunos ativos
        </Badge>
      </motion.div>

      {/* Engage Experiences (Banners & Cards) */}
      <div className="space-y-4">
        <EngageInline format="BANNER" workspaceId={workspaceSnap.activeWorkspaceId || undefined} />
        <EngageInline format="CARD" workspaceId={workspaceSnap.activeWorkspaceId || undefined} />
      </div>

      <Card className="border-border/50 bg-card/40 rounded-2xl p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4.5 text-primary" />
            <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">Métricas de Performance</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsKpisExpanded(!isKpisExpanded)}
            className="size-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <motion.div
              animate={{ rotate: isKpisExpanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <ChevronDown className="size-4" />
            </motion.div>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <KPICard title="Alunos Ativos" value={metrics.studentsMetrics.totalActive} change={metrics.studentsMetrics.totalActiveChange} icon={Users} />
          <KPICard title="Receita Mensal" value={metrics.financialMetrics.mrr} change={metrics.financialMetrics.mrrChange} icon={DollarSign} prefix="R$ " />
          <KPICard title="Taxa de Conclusão" value={metrics.studentsMetrics.completionRate} change={metrics.studentsMetrics.completionChange} icon={CheckCircle2} suffix="%" />
          <KPICard title="Faturamento Projetado" value={metrics.financialMetrics.revenueProjection} change={metrics.financialMetrics.mrrChange} icon={TrendingUp} prefix="R$ " />
        </div>

        <AnimatePresence initial={false}>
          {isKpisExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="p-0"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <KPICard title="Ticket Médio" value={metrics.financialMetrics.avgTicket} change={metrics.financialMetrics.ticketChange} icon={CreditCard} prefix="R$ " />
                <KPICard title="Risco de Churn" value={metrics.studentsMetrics.inactive} change={metrics.studentsMetrics.inactiveChange} icon={UserMinus} suffix=" alunos" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Main Dashboard Section without Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Analytical Charts & Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Row 1: Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Evolução da Receita */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-border/50 h-full flex flex-col justify-between" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold"><BarChart3 className="size-4 text-primary" />Evolução da Receita</CardTitle>
                  <CardDescription>Comparativo mensal (últimos 6 meses)</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
                    <AreaChart data={metrics.revenueHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillCurrent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} width={55} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />} />
                      <Area type="monotone" dataKey="previous" stroke="var(--chart-4)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
                      <Area type="monotone" dataKey="current" stroke="var(--chart-1)" strokeWidth={2} fill="url(#fillCurrent)" />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Modalidades de Atendimento */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold"><FileText className="size-4 text-primary" />Modalidades de Atendimento</CardTitle>
                  <CardDescription>{metrics.studentsMetrics.totalActive} alunos ativos vinculados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics.planDistribution.map((p: any) => (
                    <div key={p.plan} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">{p.plan}</span>
                        <span className="font-semibold">{p.count} {p.count === 1 ? "aluno" : "alunos"} <span className="text-xs font-normal text-muted-foreground">· R$ {p.revenue.toLocaleString("pt-BR")}</span></span>
                      </div>
                      <Progress value={(p.count / (metrics.studentsMetrics.totalActive || 1)) * 100} className="h-2 rounded-full" />
                    </div>
                  ))}
                  <div className="pt-3 border-t space-y-2 mt-4">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground font-medium">Rotatividade (Churn)</span><span className="font-semibold text-red-400">{metrics.financialMetrics.financialChurn}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground font-medium">Projeção de Receita</span><span className="font-semibold text-emerald-400">R$ {metrics.financialMetrics.revenueProjection.toLocaleString("pt-BR")}</span></div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Row 2: Performance & Activity Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Frequência Semanal */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold">
                    <CalendarCheck className="size-4 text-primary" />
                    Frequência Semanal
                  </CardTitle>
                  <CardDescription>Check-ins de alunos por dia da semana</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={frequencyChartConfig} className="h-[200px] w-full">
                    <BarChart data={metrics.weeklyFrequencyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                      <YAxis tickLine={false} axisLine={false} width={30} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Consistência de Treino */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold">
                    <Target className="size-4 text-primary" />
                    Consistência de Treino
                  </CardTitle>
                  <CardDescription>Taxa geral de aderência aos treinos do mês</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-4 pt-2">
                  <div className="relative flex items-center justify-center">
                    <svg className="size-32" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" className="stroke-muted" strokeWidth="8" />
                      <circle cx="60" cy="60" r="52" fill="none" className="stroke-primary" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${(metrics.trainingConsistency.overall / 100) * 327} 327`}
                        transform="rotate(-90 60 60)" />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-3xl font-black">{metrics.trainingConsistency.overall}%</p>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">aderência</p>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Freq. Média</span>
                      <span className="font-semibold">{metrics.studentsMetrics.avgWeeklyFrequency}x/sem</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Evolução Média Geral</span>
                      <span className="font-semibold text-emerald-400">+{metrics.studentsMetrics.avgEvolution}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Evolução de Cargas */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold"><Dumbbell className="size-4 text-primary" />Evolução de Cargas</CardTitle>
                  <CardDescription>Carga média vs benchmark (8 sem)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={loadChartConfig} className="h-[200px] w-full">
                    <LineChart data={metrics.loadEvolution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                      <YAxis tickLine={false} axisLine={false} width={30} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="benchmark" stroke="var(--chart-4)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="avg" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--chart-1)" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Percepção de Esforço */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold"><MessageSquare className="size-4 text-primary" />Percepção de Esforço</CardTitle>
                  <CardDescription>Feedbacks sobre a dificuldade dos treinos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={feedbackChartConfig} className="h-[200px] w-full flex items-center justify-center">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="difficulty" />} />
                      <Pie data={metrics.trainingFeedback} dataKey="count" nameKey="difficulty" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                        {metrics.trainingFeedback.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                    {metrics.trainingFeedback.map((f: any) => (
                      <div key={f.difficulty} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                        <span className="size-2 rounded-full" style={{ backgroundColor: f.fill }} />
                        {f.difficulty}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Operational Sidebar & Timeline */}
        <div className="space-y-6">
          {/* Alunos Inativos */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-4 text-amber-400" />
                  Alunos Inativos
                </CardTitle>
                <CardDescription>Alunos com ausência prolongada do portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.inactiveStudents.length > 0 ? (
                  metrics.inactiveStudents.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-muted font-bold text-muted-foreground">
                          {s.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">Última aula: {s.lastSession}</p>
                      </div>
                      <Badge
                        className={cn(
                          "text-xs shrink-0 font-bold rounded-full border-0",
                          riskColors[s.risk as keyof typeof riskColors]
                        )}
                      >
                        {s.daysInactive} dias off
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                    <p className="text-sm font-bold">Nenhum aluno inativo!</p>
                    <p className="text-xs text-muted-foreground">Constância perfeita no workspace.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Atividade Recente */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-bold">
                  <Activity className="size-4 text-primary" />
                  Atividade Recente
                </CardTitle>
                <CardDescription>Timeline de interações e aulas finalizadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {metrics.recentActivity.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn("size-2.5 rounded-full shrink-0 mt-1.5", activityColors[a.type as keyof typeof activityColors])} />
                      <span className="w-px flex-1 bg-border mt-1" />
                    </div>
                    <div className="pb-3 min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{a.student}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{a.action}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1 font-semibold">
                        <Clock className="size-3" />
                        {a.time}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Alunos da Semana */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-bold">
                  <Flame className="size-4 text-primary" />
                  Top Alunos da Semana
                </CardTitle>
                <CardDescription>Ranking por frequência e constância</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.topStudentsWeek.map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0", i === 0 ? "bg-primary text-primary-foreground animate-bounce" : "bg-muted text-muted-foreground")}>{i + 1}</span>
                    <Avatar className="size-8"><AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">{s.avatarFallback}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.sessions} treinos · {s.streak} dias seguidos</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-xs font-semibold gap-1 rounded-full"><TrendingUp className="size-3 text-emerald-500" />{s.progress}%</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recordes de Alunos */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-bold"><Trophy className="size-4 text-amber-400" />Recordes de Alunos</CardTitle>
                <CardDescription>Histórico de recordes pessoais (PR)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.personalRecords.map((pr: any) => (
                  <div key={pr.id} className="flex items-center gap-3">
                    <Avatar className="size-8"><AvatarFallback className="text-xs bg-amber-500/10 text-amber-400 font-bold">{pr.avatarFallback}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{pr.student}</p>
                      <p className="text-xs text-muted-foreground">{pr.exercise} · {pr.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{pr.value}</p>
                      <p className="text-xs text-muted-foreground line-through">{pr.previousBest}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
