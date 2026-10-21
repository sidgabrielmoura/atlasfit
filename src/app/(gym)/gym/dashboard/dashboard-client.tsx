"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Users,
  UserMinus,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  Target,
  Flame,
  Activity,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronDown,
  UserCheck,
  RefreshCw,
  Loader2,
  Sparkles,
  PhoneCall,
  Layers,
  ArrowRight,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { GymDashboardData } from "@/modules/workspaces";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100
  );

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  prefix = "",
  suffix = "",
  changeLabel = "vs período anterior",
  subDetail,
}: {
  title: string;
  value: string | number;
  change?: number | null;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  changeLabel?: string;
  subDetail?: string;
}) {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange ? change >= 0 : true;

  return (
    <div className="w-full min-w-0">
      <Card
        size="sm"
        className="relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xs h-full hover:border-border/80 transition-all duration-200"
      >
        <CardContent className="p-3.5 sm:p-4 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
                {title}
              </p>
              <p className="text-lg sm:text-xl font-bold tracking-tight truncate">
                {prefix}
                {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
                {suffix}
              </p>
            </div>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon className="size-3.5 sm:size-4" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2.5 pt-1 border-t border-border/30">
            {hasChange ? (
              <>
                {isPositive ? (
                  <ArrowUpRight className="size-3 text-emerald-500 shrink-0" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-400 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-[10px] font-semibold shrink-0",
                    isPositive ? "text-emerald-500" : "text-red-400"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {change}%
                </span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                  {changeLabel}
                </span>
              </>
            ) : subDetail ? (
              <span className="text-[10px] font-medium text-muted-foreground truncate">
                {subDetail}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="size-2.5" /> Estável
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const revenueChartConfig = {
  current: { label: "Faturamento Líquido", color: "var(--chart-1)" },
  previous: { label: "Mês Anterior", color: "var(--chart-4)" },
};

const frequencyChartConfig = {
  count: { label: "Check-ins / Entradas", color: "var(--chart-1)" },
};

const hourlyFlowConfig = {
  count: { label: "Alunos / Catraca", color: "var(--chart-2)" },
};

const riskColors = {
  high: "text-red-400 bg-red-400/10 border-red-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const activityTypeStyles = {
  access: { dot: "bg-emerald-500", badge: "Acesso" },
  enrollment: { dot: "bg-primary", badge: "Matrícula" },
  payment: { dot: "bg-amber-400", badge: "Financeiro" },
  alert: { dot: "bg-red-400", badge: "Aviso" },
};

export function GymDashboardClient({
  initialData,
  workspaceName,
  workspaceId,
  planName,
  isTrial,
  limits,
  hasFinancialAccess,
}: {
  initialData: GymDashboardData;
  workspaceName: string;
  workspaceId: string;
  planName: string;
  isTrial: boolean;
  limits: { maxStudents: number; maxStaff: number; maxUnits?: number };
  hasFinancialAccess: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  const [metrics, setMetrics] = useState<GymDashboardData>(initialData);
  const [isKpisExpanded, setIsKpisExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/gym/dashboard?workspaceId=${workspaceId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Falha ao atualizar dados.");
        }
        const data = await res.json();
        setMetrics(data);
        toast.success("Indicadores atualizados com sucesso!");
      } catch (err) {
        console.error(err);
        router.refresh();
        toast.info("Atualizando painel da academia...");
      }
    });
  };

  const overview = metrics.overview;
  const exec = overview.executive;

  // Cálculos de capacidade e crescimento
  const capacityPercent = limits.maxStudents > 0
    ? Math.min(100, Math.round((exec.activeStudentsCount / limits.maxStudents) * 100))
    : 0;

  const mrrInReais = Math.round(exec.mrrInCents / 100);
  const avgTicketInReais = Math.round(exec.averageTicketInCents / 100);
  const peakHour = metrics.hourlyFlowData.find((h) => h.isPeak && h.count > 0);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-400 mx-auto"
      aria-busy={isPending}
    >
      {/* 1. Header Estratégico */}
      <motion.div
        variants={item}
        className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {getGreeting()}, {user?.name?.split(" ")[0] || workspaceName}{" "}
              <span className="inline-block">🔥</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>
              Resumo operacional de hoje,{" "}
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              .
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="w-fit gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-background border-border/50 shadow-xs"
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {exec.activeStudentsCount} alunos ativos
            {limits.maxStudents > 0 && (
              <span className="text-muted-foreground font-normal">
                ({capacityPercent}% da capacidade)
              </span>
            )}
          </Badge>

          <Badge
            variant="outline"
            className="w-fit gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-background border-border/50 shadow-xs"
          >
            <span className="size-2 rounded-full bg-primary" />
            {metrics.checkinsTodayCount} check-ins hoje
          </Badge>

          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleRefresh}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border/50 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Atualizar
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
          >
            <Link href="/gym/reception">
              <UserCheck className="size-3.5" />
              Recepção Rápida
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* 2. Card de Métricas de Performance (KPIs Expansíveis) */}
      <motion.div variants={item}>
        <Card className="border-border/50 bg-card/40 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between pb-3 mb-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4.5 text-primary" />
              <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                Métricas de Performance da Academia
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {isKpisExpanded ? "Ocultar métricas secundárias" : "Ver mais métricas"}
              </span>
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
          </div>

          {/* Linha Principal de 4 KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              title="Alunos Ativos"
              value={exec.activeStudentsCount}
              subDetail={
                limits.maxStudents > 0
                  ? `${capacityPercent}% de ${limits.maxStudents} vagas`
                  : undefined
              }
              icon={Users}
            />

            <KPICard
              title="Receita Mensal (MRR)"
              value={hasFinancialAccess ? mrrInReais : "Auditado"}
              prefix={hasFinancialAccess ? "R$ " : ""}
              subDetail={
                hasFinancialAccess
                  ? `${exec.activeRecurringContracts} contratos recorrentes`
                  : "Acesso restrito a gestores"
              }
              icon={DollarSign}
            />

            <KPICard
              title="Novas Matrículas"
              value={exec.newEnrollmentsCount}
              subDetail={`${exec.renewalsCount} renovações no período`}
              icon={TrendingUp}
            />

            <KPICard
              title="Acessos / Catraca Hoje"
              value={metrics.checkinsTodayCount}
              subDetail="Check-ins registrados hoje"
              icon={UserCheck}
            />
          </div>

          <AnimatePresence initial={false}>
            {isKpisExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <KPICard
                    title="Ticket Médio"
                    value={hasFinancialAccess ? avgTicketInReais : "Auditado"}
                    prefix={hasFinancialAccess ? "R$ " : ""}
                    subDetail="Média ponderada por aluno"
                    icon={CreditCard}
                  />

                  <KPICard
                    title="Taxa de Churn"
                    value={
                      exec.churnRatePercentage !== null
                        ? exec.churnRatePercentage
                        : 0
                    }
                    suffix="%"
                    subDetail={`${exec.churnedContractsCount} cancelamentos na coorte`}
                    icon={UserMinus}
                  />

                  <KPICard
                    title="Inadimplência Global"
                    value={
                      hasFinancialAccess
                        ? overview.accountsReceivable.defaultRatePercentage
                        : 0
                    }
                    suffix="%"
                    subDetail={
                      hasFinancialAccess
                        ? `${money(overview.accountsReceivable.totalOverdueInCents)} em atraso`
                        : "Apenas gestão financeira"
                    }
                    icon={AlertTriangle}
                  />

                  <KPICard
                    title="Matrículas Pausadas"
                    value={exec.pausedStudentsCount}
                    suffix=" alunos"
                    subDetail="Trancamento temporário de plano"
                    icon={Clock}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* 3. Grid Principal de Gráficos e Operação (2/3 + 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal (2 Cols): Gráficos e Análises Estratégicas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linha 1: Evolução da Receita & Distribuição de Planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={item}>
              <Card className="border-border/50 h-full flex flex-col justify-between" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-base">
                    <BarChart3 className="size-4 text-primary" />
                    Evolução do Faturamento
                  </CardTitle>
                  <CardDescription>Receita líquida recebida (últimos 6 meses)</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end pt-2">
                  <ChartContainer config={revenueChartConfig} className="h-[230px] w-full">
                    <AreaChart
                      data={metrics.revenueHistory}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fillGymRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-xs"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                        width={50}
                        className="text-xs"
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) =>
                              `R$ ${Number(value).toLocaleString("pt-BR")}`
                            }
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="previous"
                        stroke="var(--chart-4)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fill="transparent"
                      />
                      <Area
                        type="monotone"
                        dataKey="current"
                        stroke="var(--chart-1)"
                        strokeWidth={2.2}
                        fill="url(#fillGymRevenue)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full border-border/50 flex flex-col justify-between" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-base">
                    <Layers className="size-4 text-primary" />
                    Distribuição de Planos
                  </CardTitle>
                  <CardDescription>
                    {exec.activeStudentsCount} alunos ativos em catálogo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 flex-1 flex flex-col justify-between">
                  {metrics.planDistribution.length > 0 ? (
                    <div className="space-y-3">
                      {metrics.planDistribution.map((p) => (
                        <div key={p.plan} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground font-medium truncate max-w-[160px]">
                              {p.plan}
                            </span>
                            <span className="font-semibold text-xs sm:text-sm">
                              {p.count} {p.count === 1 ? "aluno" : "alunos"}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                ({p.percentage}%)
                              </span>
                            </span>
                          </div>
                          <Progress value={p.percentage} className="h-2 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-center p-3 rounded-xl bg-muted/10 border border-dashed border-border/40">
                      <Layers className="size-6 text-muted-foreground/50 mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">Nenhum plano cadastrado</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Cadastre os planos da academia para acompanhar a adesão dos alunos.
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border/40 space-y-2 mt-auto">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground font-medium">Ticket Médio</span>
                      <span className="font-semibold">
                        {hasFinancialAccess ? money(exec.averageTicketInCents) : "Protegido"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground font-medium">
                        Capacidade Ocupada
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {limits.maxStudents > 0
                          ? `${capacityPercent}% (${exec.activeStudentsCount}/${limits.maxStudents})`
                          : `${exec.activeStudentsCount} alunos (Ilimitado)`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Linha 2: Frequência Semanal & Fluxo por Horário (Ocupação da Academia) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={item}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-base">
                    <CalendarCheck className="size-4 text-primary" />
                    Frequência Semanal
                  </CardTitle>
                  <CardDescription>Entradas na catraca por dia da semana</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <ChartContainer config={frequencyChartConfig} className="h-[200px] w-full">
                    <BarChart
                      data={metrics.weeklyFrequencyData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-xs"
                      />
                      <YAxis tickLine={false} axisLine={false} width={30} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 font-bold text-base">
                        <Activity className="size-4 text-primary" />
                        Ocupação por Horário
                      </CardTitle>
                      <CardDescription>Fluxo de alunos (06h às 22h)</CardDescription>
                    </div>
                    {peakHour && (
                      <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/20 bg-primary/5">
                        Pico: {peakHour.hour} ({peakHour.count} {peakHour.count === 1 ? "aluno" : "alunos"})
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <ChartContainer config={hourlyFlowConfig} className="h-[200px] w-full">
                    <BarChart
                      data={metrics.hourlyFlowData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis
                        dataKey="hour"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-[10px]"
                      />
                      <YAxis tickLine={false} axisLine={false} width={25} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="count"
                        fill="var(--chart-2)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Linha 3: Ciclo de Matrículas & Formas de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={item}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-base">
                    <Target className="size-4 text-primary" />
                    Ciclo de Contratos & Evasão
                  </CardTitle>
                  <CardDescription>Novas vs Renovações vs Cancelamentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div>
                      <p className="text-lg font-bold text-primary">
                        +{exec.newEnrollmentsCount}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">
                        Novas
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-500">
                        {exec.renewalsCount}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">
                        Renovações
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-400">
                        -{exec.cancelledEnrollmentsCount}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">
                        Cancelados
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Taxa de Renovação Ativa</span>
                      <span className="font-semibold text-emerald-400">
                        {exec.activeStudentsCount > 0
                          ? Math.round((exec.renewalsCount / (exec.activeStudentsCount || 1)) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Evasão (Churn do Período)</span>
                      <span className="font-semibold text-red-400">
                        {exec.churnRatePercentage !== null ? exec.churnRatePercentage : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Alunos com Matrícula Pausada</span>
                      <span className="font-semibold text-amber-400">
                        {exec.pausedStudentsCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full border-border/50" size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold text-base">
                    <CreditCard className="size-4 text-primary" />
                    Formas de Recebimento
                  </CardTitle>
                  <CardDescription>Distribuição dos métodos de pagamento</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {metrics.paymentMethodsData.length > 0 ? (
                    <>
                      <ChartContainer
                        config={{ count: { label: "Transações" } }}
                        className="h-[170px] w-full flex items-center justify-center"
                      >
                        <PieChart>
                          <ChartTooltip
                            content={<ChartTooltipContent nameKey="label" />}
                          />
                          <Pie
                            data={metrics.paymentMethodsData}
                            dataKey="count"
                            nameKey="label"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            strokeWidth={0}
                          >
                            {metrics.paymentMethodsData.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>

                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                        {metrics.paymentMethodsData.map((f) => (
                          <div
                            key={f.method}
                            className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase"
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: f.fill }}
                            />
                            {f.label} ({f.count})
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                      <CreditCard className="size-8 text-muted-foreground/30 mb-2" />
                      <p className="text-xs font-semibold text-foreground">Sem pagamentos liquidados</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
                        Nenhum recebimento confirmado foi registrado no período.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Coluna Lateral (1 Col): Inteligência Operacional & Retenção */}
        <div className="space-y-6">
          {/* Card 1: Alunos em Risco de Evasão (>10 dias off) */}
          <motion.div variants={item}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-bold text-base">
                    <AlertTriangle className="size-4 text-amber-400" />
                    Alunos em Risco de Evasão
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-semibold text-amber-400 border-amber-400/30">
                    {metrics.inactiveStudents.length} em alerta
                  </Badge>
                </div>
                <CardDescription>
                  Sem acesso à catraca há mais de 10 dias
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.inactiveStudents.length > 0 ? (
                  metrics.inactiveStudents.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-muted font-bold text-muted-foreground">
                          {s.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.planName} · Último: {s.lastSession}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          className={cn(
                            "text-[10px] font-bold rounded-full border",
                            riskColors[s.risk]
                          )}
                        >
                          {s.daysInactive}d off
                        </Badge>
                        {s.whatsapp && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                          >
                            <a
                              href={`https://wa.me/55${s.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Enviar mensagem no WhatsApp"
                            >
                              <PhoneCall className="size-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                    <p className="text-sm font-bold">Nenhum aluno em risco!</p>
                    <p className="text-xs text-muted-foreground">
                      Alta constância e frequência registrada na portaria.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2: Atividade Recente da Recepção & Portaria */}
          <motion.div variants={item}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-bold text-base">
                  <Activity className="size-4 text-primary" />
                  Atividade da Recepção
                </CardTitle>
                <CardDescription>
                  Eventos ao vivo de check-in e contratos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                {metrics.recentActivity.length > 0 ? (
                  metrics.recentActivity.map((a) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "size-2.5 rounded-full shrink-0 mt-1",
                            activityTypeStyles[a.type]?.dot || "bg-primary"
                          )}
                        />
                        <span className="w-px flex-1 bg-border/40 mt-1" />
                      </div>
                      <div className="pb-2.5 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {a.subtitle}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1 font-medium">
                          <Clock className="size-2.5" />
                          {a.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                    Nenhuma atividade recente registrada hoje.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 3: Ranking de Alunos Mais Frequentes */}
          <motion.div variants={item}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-bold text-base">
                  <Flame className="size-4 text-primary" />
                  Alunos Mais Assíduos
                </CardTitle>
                <CardDescription>
                  Ranking de constância de treinos no mês
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {metrics.topStudentsWeek.length > 0 ? (
                  metrics.topStudentsWeek.map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                          i === 0
                            ? "bg-primary text-primary-foreground font-black shadow-xs"
                            : i === 1
                              ? "bg-amber-400/20 text-amber-400 font-bold"
                              : i === 2
                                ? "bg-slate-400/20 text-slate-300 font-bold"
                                : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </span>
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                          {s.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.sessions > 0
                            ? `${s.sessions} ${s.sessions === 1 ? "presença" : "presenças"}`
                            : `${s.streak} dias de constância`}
                          {s.streak > 0 && ` · ${s.streak} dias seguidos`}
                        </p>
                      </div>
                      {s.progress > 0 && (
                        <Badge variant="outline" className="text-[11px] font-semibold gap-1 rounded-full">
                          <TrendingUp className="size-3 text-emerald-500" />
                          {s.progress}%
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                    Sem registros suficientes para o ranking esta semana.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 4: Próximos Vencimentos de Contratos (Próximos 15 dias) */}
          <motion.div variants={item}>
            <Card className="h-full border-border/50" size="sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-bold text-base">
                    <Calendar className="size-4 text-primary" />
                    Vencimentos Próximos
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] p-1 text-primary gap-1">
                    <Link href="/gym/enrollments">
                      Ver todos <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
                <CardDescription>
                  Planos com término nos próximos 15 dias
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {metrics.upcomingRenewals.length > 0 ? (
                  metrics.upcomingRenewals.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/20 border border-border/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{r.studentName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {r.planName} · Vence em {r.endDate}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold shrink-0 rounded-full",
                          r.daysRemaining <= 3
                            ? "text-red-400 border-red-400/30 bg-red-400/10"
                            : "text-amber-400 border-amber-400/30 bg-amber-400/10"
                        )}
                      >
                        {r.daysRemaining === 0 ? "Vence hoje" : `${r.daysRemaining} dias`}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="h-20 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                    Nenhum plano vencendo nos próximos 15 dias.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
