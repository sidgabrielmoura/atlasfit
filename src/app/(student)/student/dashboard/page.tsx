"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Flame,
  TrendingUp,
  Scale,
  Play,
  ChevronRight,
  Zap,
  Activity,
  Dumbbell,
  Target,
  CalendarCheck2,
  Clock,
  Trophy,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Camera,
  CreditCard,
  CheckCircle2,
  Calendar,
  Smile,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Grid container stagger animation
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function StudentDashboardPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/student/dashboard");
        if (!res.ok) {
          throw new Error("Erro ao buscar dados do dashboard do aluno.");
        }
        const dashboardData = await res.json();
        setData(dashboardData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro ao carregar os dados.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return <StudentDashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <div className="size-16 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Ops! Algo deu errado.</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Não conseguimos carregar suas informações da jornada agora. Tente recarregar a página.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-xl font-bold h-11 px-6">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const {
    streak,
    bestStreak = 0,
    adherence,
    weeklyFrequency,
    currentWeight,
    currentBF,
    evolutionPercent,
    nextWorkout,
    weightHistory,
    prs,
    alerts,
    pendingTasks,
    recentMessages,
    finance,
    workoutsOfTheWeek,
  } = data;

  const daysOfWeekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const currentDayOfWeek = new Date().getDay();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-350 mx-auto pb-24">
      {/* Welcome Header / Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {getGreeting()}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua sequência de foco está ativa em <strong className="text-primary">{streak} {streak === 1 ? "dia" : "dias"}</strong>. Continue firme!
          </p>
        </div>

        {/* Dedicated Trainer Workspace Emblem */}
        <div className="flex items-center gap-3 bg-secondary/30 backdrop-blur-md px-3.5 py-2 rounded-full border border-border/40 text-xs font-semibold w-fit transition-all duration-300 hover:bg-secondary/40">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Membro Elite · {data.workspace.name}</span>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Journey Overview */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Metrics Consolidation Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {/* Constancy Streak */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-card/60 relative overflow-hidden transition-all duration-300 hover:border-primary/20">
                <CardContent className="p-4 flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Streak</span>
                    <div className="size-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <Flame className="size-4 fill-current animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{streak} {streak === 1 ? "Dia" : "Dias"}</h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">Recorde: {bestStreak} {bestStreak === 1 ? "dia" : "dias"}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Adherence Rate */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-card/60 relative overflow-hidden transition-all duration-300 hover:border-primary/20">
                <CardContent className="p-4 flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aderência</span>
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Target className="size-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{adherence}%</h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">De conclusão de treinos</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Weekly Frequency */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-card/60 relative overflow-hidden transition-all duration-300 hover:border-primary/20">
                <CardContent className="p-4 flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Frequência</span>
                    <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <CalendarCheck2 className="size-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{weeklyFrequency}x</h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">Treinos realizados esta sem.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Current Weight */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-card/60 relative overflow-hidden transition-all duration-300 hover:border-primary/20">
                <CardContent className="p-4 flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Peso Corporal</span>
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Scale className="size-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">
                      {currentWeight !== null && currentWeight !== undefined ? `${currentWeight} kg` : "-- kg"}
                    </h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                      {currentBF !== null && currentBF !== undefined ? `${currentBF}% gordura corporal` : "--% gordura corporal"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* NEXT WORKOUT ACTION CARD (Main Highlight) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden p-0 border-primary/20 shadow-lg shadow-primary/5 bg-gradient-to-br from-card to-secondary/10 relative group">
              <div className="absolute top-0 right-0 p-8 text-primary/5 select-none pointer-events-none group-hover:text-primary/10 transition-colors hidden md:block">
                <Dumbbell className="size-44 rotate-12" />
              </div>

              <div className="flex flex-col md:flex-row">
                {/* Workout summary */}
                <div className="flex-1 p-6 md:p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest">
                      <Activity className="size-3.5 animate-pulse" />
                      Treino Recomendado
                    </div>
                    {nextWorkout ? (
                      <>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{nextWorkout.name}</h2>
                        <p className="text-muted-foreground text-sm font-medium">{nextWorkout.muscleGroupLabel}</p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Sem Treino Programado</h2>
                        <p className="text-muted-foreground text-sm font-medium">Fale com seu personal trainer.</p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{nextWorkout?.duration || "60 min"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dumbbell className="size-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{nextWorkout?.exercisesCount || 0} Exercícios</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Meta de Aderência Semanal</span>
                      <span>{adherence}%</span>
                    </div>
                    <Progress value={adherence} className="h-2 rounded-full" />
                  </div>
                </div>

                {/* Workout CTA block */}
                {nextWorkout && (
                  <div className="bg-secondary/20 p-6 md:w-64 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-border/50 gap-4">
                    <div className="text-center space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status Atual</p>
                      <p className="text-sm font-bold text-amber-500 flex items-center justify-center gap-1.5">
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        Pendente
                      </p>
                    </div>
                    <Button
                      asChild
                      className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      <Link href="/student/workout-execution">
                        <Play className="size-4 mr-2 fill-current" /> INICIAR TREINO
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Quick weight/BF% Evolution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    Evolução Corporal
                  </CardTitle>
                  <CardDescription className="text-xs">Acompanhamento de peso nas últimas semanas</CardDescription>
                </div>
                {evolutionPercent !== 0 && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">
                    {evolutionPercent > 0 ? `-${evolutionPercent}%` : `+${Math.abs(evolutionPercent)}%`} desde o início
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="pt-2">
                {weightHistory && weightHistory.length > 0 ? (
                  <div className="h-[220px] w-full min-w-0">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weightHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-bold text-muted-foreground" />
                          <YAxis tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} className="text-[10px] font-bold text-muted-foreground" />
                          <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px" }} />
                          <Area type="monotone" dataKey="value" name="Peso (kg)" stroke="var(--primary)" strokeWidth={2.5} fill="url(#fillWeight)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 space-y-2 border border-dashed border-border/40 rounded-xl bg-secondary/5">
                    <TrendingUp className="size-8 text-muted-foreground/50" />
                    <p className="text-xs font-bold text-foreground">Nenhum registro de evolução</p>
                    <p className="text-[10px] text-muted-foreground max-w-[280px]">
                      Seu treinador ainda não registrou nenhuma pesagem ou avaliação física para acompanhar seu progresso corporal.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Workouts Map / Grid (Resumo de treinos da semana) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  Divisão de Treinos Semanais
                </CardTitle>
                <CardDescription className="text-xs">Cronograma planejado pelo seu personal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                  {daysOfWeekLabels.map((dayLabel, idx) => {
                    const dayWorkouts = workoutsOfTheWeek.filter((w: any) => w.dayOfWeek === idx);
                    const isToday = currentDayOfWeek === idx;
                    const hasWorkout = dayWorkouts.length > 0;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col items-center justify-between text-center gap-2 transition-all min-h-[90px] shadow-sm",
                          isToday && "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/20",
                          !isToday && hasWorkout && "border-border bg-card",
                          !isToday && !hasWorkout && "border-border/40 bg-secondary/5 opacity-55"
                        )}
                      >
                        <span className={cn("text-[10px] uppercase font-bold tracking-wider", isToday ? "text-primary" : "text-muted-foreground")}>
                          {dayLabel}
                        </span>

                        {hasWorkout ? (
                          <div className="space-y-1 w-full">
                            {dayWorkouts.map((w: any) => (
                              <Badge
                                key={w.id}
                                className="w-full justify-center text-[9px] font-extrabold px-1 py-0.5 truncate bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none uppercase"
                              >
                                {w.muscleGroupLabel || w.name.split(" ")[0]}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Descanso</span>
                        )}

                        {isToday && (
                          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right 1 Column: Notifications, Alerts, PRs, Tasks & Finance */}
        <div className="space-y-6">

          {/* Active Subscription & Basic Financial Status */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={cn(
              "border-border/50 shadow-sm transition-all duration-300",
              finance.status === "Pendente" ? "border-amber-500/30 bg-amber-500/[0.02]" : "bg-card"
            )}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Financeiro</CardTitle>
                  <CardDescription className="text-xs">Seu plano contratado</CardDescription>
                </div>
                <Badge className={cn(
                  "rounded-full border-none px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                  finance.status === "Pendente"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}>
                  {finance.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-xl border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Plano {finance.plan}</p>
                      <p className="text-[10px] text-muted-foreground">Mensalidade ativa</p>
                    </div>
                  </div>
                </div>

                {finance.status === "Pendente" && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-amber-500 leading-relaxed font-medium">
                      Existe uma cobrança pendente de <strong>R$ {finance.pendingAmount}</strong>. Regularize para evitar o bloqueio de seus treinos.
                    </p>
                    <Button className="w-full h-10 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-sm cursor-pointer">
                      Pagar Agora via Pix
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Tasks & Check-ins (Interactive List) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />
                  Pendências do Aluno
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pendingTasks.length > 0 ? (
                  <div className="divide-y divide-border/40">
                    {pendingTasks.map((task: any) => {
                      const getTaskLink = (id: string) => {
                        if (id === "task-photo") return "/student/evolution";
                        if (id === "task-weight") return "/student/evolution";
                        if (id === "task-workout") return "/student/workout-execution";
                        if (id === "task-feedback") return "/student/feedbacks";
                        return "#";
                      };

                      const itemContent = (
                        <div className="p-4 flex items-center gap-3 hover:bg-secondary/15 transition-colors cursor-pointer">
                          <div className={cn(
                            "size-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                            task.icon === "Camera" ? "bg-blue-500/10 text-blue-500" :
                              task.icon === "Scale" ? "bg-amber-500/10 text-amber-500" :
                                task.icon === "Smile" ? "bg-indigo-500/10 text-indigo-500" :
                                  "bg-primary/10 text-primary"
                          )}>
                            {task.icon === "Camera" ? <Camera className="size-4.5" /> :
                              task.icon === "Scale" ? <Scale className="size-4.5" /> :
                                task.icon === "Smile" ? <Smile className="size-4.5" /> :
                                  <Dumbbell className="size-4.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate text-foreground">{task.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                        </div>
                      );

                      const link = getTaskLink(task.id);
                      if (link === "#") return <div key={task.id}>{itemContent}</div>;

                      return (
                        <Link key={task.id} href={link} className="block">
                          {itemContent}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-2 flex flex-col items-center">
                    <CheckCircle2 className="size-6 text-emerald-500" />
                    <p className="text-xs font-bold">Tudo em dia! 🎉</p>
                    <p className="text-[10px] text-muted-foreground">Nenhuma pendência para hoje.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Coach's Alerts / Advice */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/50 bg-amber-500/[0.02] border-dashed shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  <Lightbulb className="size-4 animate-pulse" />
                  Instruções do Coach
                </div>
                {alerts.map((a: any) => (
                  <p key={a.id} className="text-xs text-muted-foreground leading-relaxed font-medium">
                    {a.text}
                  </p>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Latest Personal Records (PRs) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500 animate-bounce" />
                  Recordes Pessoais (PR)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prs && prs.length > 0 ? (
                  prs.map((pr: any) => (
                    <div key={pr.id} className="flex items-center justify-between gap-3 text-xs bg-secondary/10 p-3 rounded-xl border border-border/30">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{pr.exercise}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Bateu em {pr.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className="bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5">
                          {pr.value}
                        </Badge>
                        <p className="text-[9px] text-muted-foreground mt-0.5 line-through">{pr.previousBest}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 space-y-1.5 text-muted-foreground flex flex-col items-center">
                    <Trophy className="size-6 mb-1 opacity-55 text-muted-foreground" />
                    <p className="text-xs font-bold text-foreground">Nenhum recorde ainda</p>
                    <p className="text-[10px] text-muted-foreground max-w-[200px]">
                      Seus recordes pessoais de carga aparecerão aqui conforme você registrar seus treinos concluídos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Messages / Feedback Chat */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  Chat / Reajustes
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[10px] font-bold text-primary h-7 px-2">
                  <Link href="/student/feedbacks">Enviar Feedback</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentMessages.length > 0 ? (
                  recentMessages.map((msg: any) => (
                    <div key={msg.id} className="bg-secondary/15 p-3 rounded-xl border border-border/40 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                        <span>{msg.sender === "Você" ? "Você" : "Personal"}</span>
                        <span>{msg.date}</span>
                      </div>
                      <p className="text-foreground font-medium line-clamp-2 leading-relaxed">
                        "{msg.text}"
                      </p>
                      <p className="text-[9px] text-primary font-bold uppercase pt-1 tracking-tight">
                        Ex: {msg.exercise}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 space-y-1 text-muted-foreground flex flex-col items-center">
                    <MessageSquare className="size-5 mb-1.5 opacity-55" />
                    <p className="text-[11px] font-bold">Nenhuma conversa recente</p>
                    <p className="text-[9px]">Solicite ajustes de exercícios ao seu coach.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// Highly structured responsive skeleton component mirroring final design exactly (avoids Layout Shift!)
function StudentDashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full mx-auto animate-pulse">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-muted" />
          <Skeleton className="h-4 w-96 bg-muted" />
        </div>
        <Skeleton className="h-8 w-44 bg-muted rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main area */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-3 w-12 bg-muted" />
                    <Skeleton className="size-8 bg-muted rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-20 bg-muted" />
                    <Skeleton className="h-3 w-24 bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Hero workout action card */}
          <Card className="border-border/50 bg-card">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-6 md:p-8 space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-28 bg-muted" />
                  <Skeleton className="h-7 w-60 bg-muted" />
                  <Skeleton className="h-4 w-40 bg-muted" />
                </div>
                <div className="flex gap-6">
                  <Skeleton className="h-4 w-16 bg-muted" />
                  <Skeleton className="h-4 w-20 bg-muted" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32 bg-muted" />
                  <Skeleton className="h-2 w-full bg-muted" />
                </div>
              </div>
              <div className="bg-secondary/10 p-6 md:w-64 flex flex-col justify-center items-center gap-4">
                <Skeleton className="h-8 w-24 bg-muted" />
                <Skeleton className="h-12 w-full bg-muted rounded-xl" />
              </div>
            </div>
          </Card>

          {/* Evolution Chart */}
          <Card className="border-border/50">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-32 bg-muted" />
              <Skeleton className="h-3 w-48 bg-muted" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[220px] w-full bg-muted/30 rounded-xl" />
            </CardContent>
          </Card>

          {/* Weekly Workouts Map */}
          <Card className="border-border/50">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-36 bg-muted" />
              <Skeleton className="h-3 w-44 bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-[90px] w-full bg-muted/40 rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Finance summary */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-28 bg-muted" />
              <Skeleton className="h-3 w-36 bg-muted" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-14 w-full bg-muted rounded-xl" />
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-32 bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-muted rounded-xl" />
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-3 w-28 bg-muted" />
              <Skeleton className="h-12 w-full bg-muted" />
            </CardContent>
          </Card>

          {/* PRs */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-36 bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-muted rounded-xl" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
